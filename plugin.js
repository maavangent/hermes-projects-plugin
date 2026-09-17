/**
 * Hermes Desktop plugin: Projects
 *
 * A project-first alternative view over Hermes' existing projects and sessions.
 * Save location: ~/.hermes/desktop-plugins/projects/plugin.js
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  host,
  icons,
  relativeTime,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  PALETTE_AREA,
  atom,
  useQuery,
  useValue
} from '@hermes/plugin-sdk'
import { useMemo, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'projects'
const PAGE = '/projects'
const DEFAULT_SETTINGS = { sort: 'recent' }
const selectedProjectId = atom(null)

const safeTime = value => {
  if (!value) return 'No activity yet'
  const timestamp = value < 100000000000 ? value * 1000 : value
  return relativeTime(timestamp)
}
const projectPath = project => project.primary_path || project.path || project.folders?.find(f => f.is_primary)?.path || project.folders?.[0]?.path || ''
const projectName = project => project.name || project.label || 'Untitled project'

function loadSettings() {
  return DEFAULT_SETTINGS
}

let settings = DEFAULT_SETTINGS

function useProjectsData() {
  const projects = useQuery({
    queryKey: [ID, 'projects'],
    queryFn: () => host.request('projects.list', {}),
    refetchInterval: 5000
  })
  const tree = useQuery({
    queryKey: [ID, 'tree'],
    queryFn: () => host.request('projects.tree', { preview_limit: 1 }),
    refetchInterval: 5000
  })
  return { projects, tree }
}

function normalizeProjects(projectPayload, treePayload) {
  const projectRows = projectPayload?.projects || []
  const treeRows = treePayload?.projects || []
  const byId = new Map(treeRows.map(row => [row.id, row]))
  return projectRows
    .filter(project => !project.archived)
    .map(project => {
      const tree = byId.get(project.id) || {}
      return {
        ...project,
        ...tree,
        id: project.id,
        name: projectName(project),
        path: projectPath(project) || tree.path || '',
        sessionCount: tree.sessionCount || 0,
        lastActive: tree.lastActive || 0,
        previewSessions: tree.previewSessions || []
      }
    })
}

function openProject(id) {
  selectedProjectId.set(id)
  host.navigate(PAGE)
}

async function startSession(project) {
  const cwd = projectPath(project)
  const result = await host.request('session.create', {
    source: 'desktop',
    cwd: cwd || undefined,
    title: projectName(project)
  })
  await host.openSession(result.session_id, { intent: 'tab' })
}

function ProjectCard({ project }) {
  return jsxs('article', {
    className: 'group flex min-h-[148px] cursor-pointer flex-col rounded-lg border border-(--ui-stroke-secondary) p-4 transition-colors hover:bg-(--chrome-action-hover)',
    onClick: () => openProject(project.id),
    children: [
      jsxs('div', { className: 'flex min-w-0 items-center gap-2', children: [
        jsx(icons.FolderOpen, { className: 'size-4 shrink-0 text-(--ui-text-tertiary)' }),
        jsx('h2', { className: 'truncate text-sm font-medium', children: project.name })
      ] }),
      jsx('div', { className: 'mt-2 truncate text-xs text-(--ui-text-tertiary)', title: project.path, children: project.path || 'No repository path' }),
      jsx('div', { className: 'mt-auto pt-5 text-xs text-(--ui-text-quaternary)', children: [
        `${project.sessionCount} ${project.sessionCount === 1 ? 'session' : 'sessions'}`,
        project.previewSessions?.[0]?.title ? ` · ${project.previewSessions[0].title}` : '',
        ` · Updated ${safeTime(project.lastActive)}`
      ].join('') })
    ]
  })
}

function NewProject({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [folders, setFolders] = useState([])
  const cwd = useValue(host.state.cwd)
  const create = async () => {
    if (!name.trim()) return
    const created = await createProject(name.trim(), folders.length ? folders : (cwd ? [cwd] : []), onCreated)
    if (!created) return
    setOpen(false)
    setName('')
    setFolders([])
  }
  return jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    jsx(Button, { onClick: () => setOpen(true), children: 'New project' }),
    jsxs(DialogContent, { className: 'max-w-lg', children: [
      jsxs(DialogHeader, { children: [jsx(DialogTitle, { children: 'New project' }), jsx(DialogDescription, { children: 'Name a workspace and add one or more folders.' })] }),
      jsx(Input, { autoFocus: true, value: name, placeholder: 'e.g. Skunkworks', onChange: e => setName(e.target.value) }),
      jsxs('section', { className: 'flex flex-col gap-2', children: [jsx('div', { className: 'text-xs text-(--ui-text-tertiary)', children: 'Folders' }), folders.length ? folders.map(folder => jsx('div', { key: folder, className: 'truncate text-sm', children: folder })) : jsx('div', { className: 'text-sm text-(--ui-text-quaternary)', children: 'No folders added yet.' }), jsx(Button, { variant: 'ghost', onClick: () => { if (cwd && !folders.includes(cwd)) setFolders([...folders, cwd]) }, children: '+ Add folder' })] }),
      jsxs(DialogFooter, { children: [jsx(Button, { variant: 'ghost', onClick: () => setOpen(false), children: 'Cancel' }), jsx(Button, { disabled: !name.trim(), onClick: () => void create(), children: 'Create' })] })
    ] })
  ] })
}

async function createProject(name, folders, onCreated) {
  try {
    await host.request('projects.create', { name, folders, primary_path: folders[0] || null, use: true })
    onCreated()
    return true
  } catch (error) {
    host.notifyError(error, 'Could not create project')
    return false
  }
}

function ProjectsPage() {
  const { projects, tree } = useProjectsData()
  const [query, setQuery] = useState('')
  const [view, setView] = useState(settings)
  const rows = useMemo(() => normalizeProjects(projects.data, tree.data)
    .filter(project => project.name.toLowerCase().includes(query.toLowerCase()) || project.path.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => view.sort === 'name' ? a.name.localeCompare(b.name) : (b.lastActive || 0) - (a.lastActive || 0)), [projects.data, tree.data, query, view.sort])
  if (projects.isLoading || tree.isLoading) return jsx('div', { className: 'flex h-full flex-col gap-4 p-8', children: [jsx(Skeleton, { className: 'h-8 w-48' }), jsx(Skeleton, { className: 'h-24 w-full' })] })
  if (projects.isError || tree.isError) return jsxs('div', { className: 'flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-(--ui-text-tertiary)', children: [jsx('div', { children: 'Could not load projects.' }), jsx(Button, { variant: 'ghost', onClick: () => { void projects.refetch(); void tree.refetch() }, children: 'Retry' })] })
  return jsxs('main', { className: 'projects-page flex h-full flex-col gap-6 overflow-auto p-8', children: [
    jsxs('header', { className: 'flex items-start justify-between gap-4', children: [
      jsxs('div', { children: [jsx('h1', { className: 'text-2xl font-semibold', children: 'Projects' }), jsx('p', { className: 'mt-1 text-sm text-(--ui-text-tertiary)', children: 'Choose a project before starting a session.' })] }),
      jsx(NewProject, { onCreated: () => { void projects.refetch(); void tree.refetch() } })
    ] }),
    jsxs('div', { className: 'flex items-center justify-between gap-3', children: [jsx(SearchField, { value: query, onChange: setQuery, placeholder: 'Search projects' }), jsx(Select, { value: view.sort, onValueChange: sort => { setView({ sort }); settings = { sort } }, children: [jsxs(SelectTrigger, { className: 'h-8 w-[140px]', children: [jsx(SelectValue, { placeholder: 'Sort' })] }), jsxs(SelectContent, { children: [jsx(SelectItem, { value: 'recent', children: 'Recent activity' }), jsx(SelectItem, { value: 'name', children: 'Name' })] })] })] }),
    rows.length ? jsx('section', { className: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', children: rows.map(project => jsx(ProjectCard, { key: project.id, project })) }) : jsx('div', { className: 'flex flex-1 items-center justify-center text-sm text-(--ui-text-tertiary)', children: query ? 'No matching projects' : 'No projects yet' })
  ] })
}

function ProjectDetail({ id }) {
  const detailQuery = useQuery({
    queryKey: [ID, 'project-sessions', id],
    queryFn: () => host.request('projects.project_sessions', { project_id: id }),
    refetchInterval: 5000
  })
  const data = detailQuery.data?.project || null
  const error = detailQuery.error
  const project = data
  const sessions = (data?.repos || []).flatMap(repo => (repo.groups || []).flatMap(group => group.sessions || []))
  const sessionCount = sessions.length || data?.sessionCount || 0
  return jsxs('main', { className: 'projects-page flex h-full flex-col gap-5 overflow-auto p-8', children: [
    jsx(Button, { variant: 'ghost', className: 'self-start', onClick: () => { selectedProjectId.set(null); host.navigate(PAGE) }, children: '← Back to projects' }),
    jsxs('header', { className: 'flex items-center justify-between gap-4', children: [
      jsxs('div', { children: [jsx('h1', { className: 'text-xl font-semibold', children: projectName(project || data || {}) }), jsx('p', { className: 'mt-1 text-sm text-(--ui-text-tertiary)', children: `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}` })] }),
      jsx(Button, { onClick: () => startSession(project || data), children: 'New session' })
    ] }),
    error ? jsx('div', { className: 'text-sm text-(--ui-text-tertiary)', children: 'Could not load sessions.' }) : sessions.map(session => jsx('div', { className: 'flex items-start justify-between gap-4 rounded-md px-3 py-2 hover:bg-(--chrome-action-hover)', children: [jsxs('button', { type: 'button', className: 'min-w-0 flex-1 text-left', onClick: () => host.openSession(session.id, { intent: 'tab' }), children: [jsx('span', { className: 'block truncate text-sm', children: session.title || 'Untitled session' }), jsx('span', { className: 'mt-1 block truncate text-xs text-(--ui-text-tertiary)', children: session.preview || 'No preview' })] }), jsx('span', { className: 'shrink-0 text-xs text-(--ui-text-quaternary)', children: safeTime(session.last_active || session.started_at) })] })),
    !error && data && !sessions.length ? jsx('div', { className: 'py-10 text-sm text-(--ui-text-tertiary)', children: 'No sessions in this project yet.' }) : null
  ] })
}

function ProjectsRoute() {
  const selectedId = useValue(selectedProjectId)
  const path = window.location.hash.replace(/^#/, '') || PAGE
  return selectedId && path === PAGE ? jsx(ProjectDetail, { id: selectedId }) : jsx(ProjectsPage, {})
}

export default {
  id: ID,
  name: 'Projects',
  register(ctx) {
    ctx.register({ id: 'page', area: ROUTES_AREA, data: { path: PAGE }, render: () => jsx(ProjectsRoute, {}) })
    ctx.register({ id: 'nav', area: SIDEBAR_NAV_AREA, data: { path: PAGE, label: 'Projects', codicon: 'project' } })
    ctx.register({ id: 'open', area: PALETTE_AREA, data: { id: `${ID}.open`, label: 'Open Projects', keywords: ['projects', 'project'], run: () => { selectedProjectId.set(null); host.navigate(PAGE) } } })
  }
}
