// Offline, non-executing extractor for Matthias Ölschlegel's pinned desktop material.
// node extract.mjs YPlENOCxr.js OiX9Y1TLb.js FFrkgzskp.js > material.json
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { parse } from 'acorn'

const hashes = [
  '3098ec4cfcc0b7088c5d5a09353a7ab0aea585c8e082cdb11cf635873be52cbd',
  'c402e6d65634224190aed31964ed6f8f476ce50a51477f6acea3eea26978508b',
  'ac5f8d2b6fa9eddd0948a2d2f5c05eeb306bfa02347baa6a5cc6c96987139ad2',
]
const files = process.argv.slice(2)
assert.equal(files.length, 3, 'Pass the pinned Navbar, NavLink, then GlassCTA JS files')
function* walk(node) {
  if (!node?.type) return
  yield node
  for (const v of Object.values(node)) for (const child of Array.isArray(v) ? v : [v]) yield* walk(child)
}
const [nav, link, cta] = files.map((path, i) => {
  const bytes = readFileSync(path)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[i], path)
  return [...walk(parse(bytes.toString(), { sourceType: 'module', ecmaVersion: 'latest' }))]
})
const prop = (node, key) => node?.properties?.find(p => (p.key?.name ?? p.key?.value) === key)?.value
const named = (nodes, name) => nodes.find(n => prop(n, 'data-framer-name')?.value === name && prop(n, 'style'))
const declaration = (nodes, name) => nodes.find(n => n.type === 'VariableDeclarator' && n.id.name === name).init
const value = n => n.type === 'ArrayExpression' ? n.elements.map(value) : n.value
const fields = (node, ...keys) => Object.fromEntries(keys.map(k => [k, value(prop(node,k))]))
const style = (nodes, name, ...keys) => fields(prop(named(nodes, name), 'style'), ...keys)
const interaction = (nodes, hoverKey, ...keys) => ({
  rest: style(nodes, 'Default', ...keys),
  hover: fields(prop(prop(named(nodes, 'Default'), 'variants'), hoverKey), ...keys),
})
const material = {
  rim: style(nav, 'Desktop', 'background', 'boxShadow'),
  face: style(nav, 'Content', 'background', 'boxShadow'),
  gem: style(nav, 'Gem Body', 'background', 'boxShadow', 'rotate'),
  facet: style(nav, 'Facet', 'backgroundColor'),
  link: interaction(link, 'uTH00razm-hover', 'backgroundColor', 'boxShadow'),
  cta: interaction(cta, 'AM_udQqZY-hover', 'background', 'boxShadow'),
  shine: style(cta, 'Shine', 'background', 'rotate', 'opacity'),
  surfaceTransition: fields(declaration(link, 'transition1'), 'type','duration','bounce'),
  shineTransition: fields(declaration(cta, 'transition2'), 'type','duration','ease'),
}
assert.deepEqual(material.surfaceTransition, fields(declaration(cta, 'transition1'), 'type','duration','bounce'))
process.stdout.write(JSON.stringify(material, null, 2) + '\n')
