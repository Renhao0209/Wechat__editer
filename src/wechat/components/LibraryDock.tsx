import { useMemo } from 'react'
import type { ComponentCategory, ComponentConfigSchema, ComponentItem, LayoutPreset } from '../library/types'
import type { SelectedComponentInstance } from '../library/componentSelection'
import { ComponentPropsPanel } from './ComponentPropsPanel'

export type ComponentUiCategory = Exclude<ComponentCategory, '分隔'>

const COMPONENT_CATEGORY_ORDER: ComponentUiCategory[] = ['标题', '卡片', '引用', '分割线', '清单', '图片']

const COMPONENT_CATEGORY_LABEL: Record<ComponentUiCategory, string> = {
  标题: '标题',
  卡片: '内容框',
  引用: '引用',
  分割线: '分割线',
  清单: '清单',
  图片: '图片',
}

const toUiCategory = (cat: ComponentCategory): ComponentUiCategory => (cat === '分隔' ? '分割线' : cat)

type Props = {
  libraryTab: 'components' | 'layouts' | 'props'
  setLibraryTab: (tab: 'components' | 'layouts' | 'props') => void

  componentQuery: string
  setComponentQuery: (q: string) => void

  componentCategory: ComponentUiCategory | 'all'
  setComponentCategory: (cat: ComponentUiCategory | 'all') => void

  components: ComponentItem[]
  getComponentSchema: (c: ComponentItem) => ComponentConfigSchema | null
  getComponentRenderer: (c: ComponentItem) => ComponentItem['render'] | null
  onInsertComponent: (componentId: string) => void

  layoutPresets: LayoutPreset[]
  onSmartFormat: () => void
  onApplyLayoutReplace: (layoutId: string) => void

  editor: unknown
  selectedComponent: SelectedComponentInstance | null
  setSelectedComponent: (next: SelectedComponentInstance | null) => void
  componentPropsValues: Record<string, string>
  setComponentPropsValues: (next: Record<string, string>) => void
  flash: (msg: string) => void

  onApplySelectedComponentProps: () => void
  onResetSelectedComponentDefaults: () => void
  onCopyStyleToSameComponents: () => void

  probeSelectedComponent: (editor: unknown) => SelectedComponentInstance | null
}

export function LibraryDock({
  libraryTab,
  setLibraryTab,
  componentQuery,
  setComponentQuery,
  componentCategory,
  setComponentCategory,
  components,
  getComponentSchema,
  getComponentRenderer,
  onInsertComponent,
  layoutPresets,
  onSmartFormat,
  onApplyLayoutReplace,
  editor,
  selectedComponent,
  setSelectedComponent,
  componentPropsValues,
  setComponentPropsValues,
  flash,
  onApplySelectedComponentProps,
  onResetSelectedComponentDefaults,
  onCopyStyleToSameComponents,
  probeSelectedComponent,
}: Props) {
  const filteredComponents = useMemo(() => {
    const q = componentQuery.trim().toLowerCase()
    return components.filter((c) => {
      if (componentCategory !== 'all' && toUiCategory(c.category) !== componentCategory) return false
      if (!q) return true
      const desc = c.desc ?? c.description ?? ''
      const tags = (c.tags ?? []).join(' ')
      return (
        c.name.toLowerCase().includes(q) ||
        (desc ? desc.toLowerCase().includes(q) : false) ||
        (tags ? tags.toLowerCase().includes(q) : false) ||
        c.id.toLowerCase().includes(q)
      )
    })
  }, [componentCategory, componentQuery, components])

  return (
    <aside className="wechatLibrary wechatLibrary--top" aria-label="素材库">
      <div className="wechatLibrary__tabs" role="tablist" aria-label="素材库">
        <button
          type="button"
          role="tab"
          aria-selected={libraryTab === 'components'}
          className={`wechatLibrary__tab ${libraryTab === 'components' ? 'is-active' : ''}`}
          onClick={() => setLibraryTab('components')}
        >
          组件
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={libraryTab === 'layouts'}
          className={`wechatLibrary__tab ${libraryTab === 'layouts' ? 'is-active' : ''}`}
          onClick={() => setLibraryTab('layouts')}
        >
          套版
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={libraryTab === 'props'}
          className={`wechatLibrary__tab ${libraryTab === 'props' ? 'is-active' : ''}`}
          onClick={() => setLibraryTab('props')}
        >
          属性
        </button>
      </div>

      {libraryTab === 'components' && (
        <div className="wechatLibrary__panel" role="tabpanel">
          <div className="wechatLibrary__hint">点击即可插入到光标位置</div>
          <div className="wechatLibrary__tools" aria-label="组件筛选">
            <input
              className="wechatLibrary__search"
              value={componentQuery}
              onChange={(e) => setComponentQuery(e.target.value)}
              placeholder="搜索组件（名称/描述/ID）"
            />

            <div className="wechatLibrary__cats" role="group" aria-label="组件分类">
              <button
                type="button"
                className={`wechatPill ${componentCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setComponentCategory('all')}
              >
                全部
              </button>
              {COMPONENT_CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`wechatPill ${componentCategory === cat ? 'is-active' : ''}`}
                  onClick={() => setComponentCategory(cat)}
                >
                  {COMPONENT_CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>
          </div>

          {filteredComponents.length === 0 ? (
            <div className="wechatLibrary__empty">没有匹配的组件</div>
          ) : (
            (componentCategory === 'all' ? COMPONENT_CATEGORY_ORDER : [componentCategory]).map((cat) => {
              const list = filteredComponents.filter((c) => toUiCategory(c.category) === cat)
              if (list.length === 0) return null
              return (
                <div key={cat} className="wechatLibrary__group">
                  <div className="wechatLibrary__groupTitle">{COMPONENT_CATEGORY_LABEL[cat]}</div>
                  <div className="wechatLibrary__grid">
                    {list.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="wechatCardBtn"
                        onClick={() => onInsertComponent(c.id)}
                        title={c.desc ?? c.name}
                      >
                        {(() => {
                          const desc = c.desc ?? c.description
                          const schema = getComponentSchema(c)
                          const renderer = getComponentRenderer(c)
                          const isEditable = Boolean(schema && renderer)
                          const tags = (c.tags ?? []).filter((t) => typeof t === 'string' && t.trim().length > 0)
                          const catLabel = COMPONENT_CATEGORY_LABEL[toUiCategory(c.category)]
                          const thumbText = (catLabel || c.name || c.id).slice(0, 2)

                          return (
                            <>
                              <div className="wechatCardBtn__row">
                                <div className="wechatCardBtn__thumb" aria-hidden="true">
                                  {c.previewThumb ? (
                                    <img
                                      className="wechatCardBtn__thumbImg"
                                      src={c.previewThumb}
                                      alt=""
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="wechatCardBtn__thumbPh">{thumbText}</div>
                                  )}
                                </div>

                                <div className="wechatCardBtn__main">
                                  <div className="wechatCardBtn__titleRow">
                                    <div className="wechatCardBtn__title">{c.name}</div>
                                    {isEditable && <span className="wechatBadge">可编辑</span>}
                                  </div>
                                  <div className="wechatCardBtn__meta">{c.id}</div>
                                  {desc && <div className="wechatCardBtn__desc">{desc}</div>}
                                </div>
                              </div>

                              {tags.length > 0 && (
                                <div className="wechatCardBtn__tags" aria-label="标签">
                                  {tags.slice(0, 4).map((t) => (
                                    <span key={t} className="wechatTag">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {libraryTab === 'layouts' && (
        <div className="wechatLibrary__panel" role="tabpanel">
          <div className="wechatLibrary__hint">「整篇套版」会覆盖当前内容；「智能套版」会在保留内容的前提下增强样式。</div>

          <button type="button" className="wechatPrimaryAction" onClick={onSmartFormat}>
            智能套版（不覆盖）
          </button>

          <div className="wechatLibrary__group">
            <div className="wechatLibrary__groupTitle">整篇模板（覆盖）</div>
            <div className="wechatLibrary__grid">
              {layoutPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="wechatCardBtn"
                  onClick={() => onApplyLayoutReplace(p.id)}
                  title={p.desc}
                >
                  <div className="wechatCardBtn__title">{p.name}</div>
                  <div className="wechatCardBtn__desc">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {libraryTab === 'props' && (
        <ComponentPropsPanel
          selected={Boolean(selectedComponent)}
          component={selectedComponent ? components.find((x) => x.id === selectedComponent.componentId) ?? null : null}
          schema={
            selectedComponent
              ? (() => {
                  const c = components.find((x) => x.id === selectedComponent.componentId)
                  return c ? getComponentSchema(c) : null
                })()
              : null
          }
          values={componentPropsValues}
          onChange={setComponentPropsValues}
          onRefreshFromCursor={() => {
            if (!editor) return
            const found = probeSelectedComponent(editor)
            setSelectedComponent(found)
            if (!found) flash('未识别到组件：请把光标放到组件块内部（或点一下组件文字）')
          }}
          onApply={onApplySelectedComponentProps}
          onResetDefaults={onResetSelectedComponentDefaults}
          onCopyStyleToSame={onCopyStyleToSameComponents}
        />
      )}
    </aside>
  )
}
