import { Reorder, useDragControls } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Space } from './types'

const LONG_PRESS_MS = 420
const MOVE_CANCEL_PX = 10
const PAN_START_PX = 6

function isMousePointer(e: { pointerType: string }) {
  return e.pointerType === 'mouse' || e.pointerType === ''
}

function SpaceNavItem({
  space,
  active,
  reorderArmed,
  onSelect,
  onArmReorder,
  onReorderEnd,
  shouldSuppressClick,
}: {
  space: Space
  active: boolean
  reorderArmed: boolean
  onSelect: () => void
  onArmReorder: () => void
  onReorderEnd: () => void
  shouldSuppressClick: () => boolean
}) {
  const controls = useDragControls()
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const armedRef = useRef(false)
  const draggedRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => () => clearTimer(), [])

  useEffect(() => {
    armedRef.current = reorderArmed
  }, [reorderArmed])

  return (
    <Reorder.Item
      as="div"
      value={space.id}
      className={`nav-reorder-item${dragging ? ' is-dragging' : ''}${reorderArmed ? ' is-armed' : ''}`}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.08, zIndex: 8 }}
      onDragStart={() => {
        draggedRef.current = true
        setDragging(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        armedRef.current = false
        onReorderEnd()
        window.setTimeout(() => {
          draggedRef.current = false
        }, 0)
      }}
    >
      <button
        type="button"
        className={`nav-item ${active ? 'active' : ''}`}
        onClick={(e) => {
          if (e.detail > 1) return
          if (draggedRef.current || armedRef.current) return
          if (shouldSuppressClick()) return
          onSelect()
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onArmReorder()
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          clearTimer()
          startRef.current = { x: e.clientX, y: e.clientY }

          if (isMousePointer(e) && reorderArmed) {
            e.stopPropagation()
            controls.start(e.nativeEvent)
            return
          }

          if (isMousePointer(e)) return

          armedRef.current = false
          const evt = e
          timerRef.current = window.setTimeout(() => {
            armedRef.current = true
            onArmReorder()
            try {
              navigator.vibrate?.(12)
            } catch {
              /* ignore */
            }
            controls.start(evt.nativeEvent)
          }, LONG_PRESS_MS)
        }}
        onPointerMove={(e) => {
          if (!startRef.current || timerRef.current == null) return
          const dx = Math.abs(e.clientX - startRef.current.x)
          const dy = Math.abs(e.clientY - startRef.current.y)
          if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearTimer()
        }}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="nav-dot" style={{ background: space.color }} />
        <span className="nav-item-label">{space.name}</span>
      </button>
    </Reorder.Item>
  )
}

export function BottomNav({
  spaces,
  spaceIds,
  activeView,
  activeSpaceId,
  onHome,
  onSettings,
  onSpace,
  onReorder,
}: {
  spaces: Space[]
  spaceIds: string[]
  activeView: string
  activeSpaceId: string | null
  onHome: () => void
  onSettings: () => void
  onSpace: (id: string) => void
  onReorder: (ids: string[]) => void
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollArmed, setScrollArmed] = useState(false)
  const [reorderArmedId, setReorderArmedId] = useState<string | null>(null)
  const panRef = useRef<{
    pointerId: number
    startX: number
    startScroll: number
    active: boolean
  } | null>(null)
  const didPanRef = useRef(false)

  const endPan = (pointerId?: number) => {
    const pan = panRef.current
    if (!pan) return
    if (pointerId != null && pan.pointerId !== pointerId) return
    const el = scrollRef.current
    if (el && pan.active) {
      try {
        el.releasePointerCapture(pan.pointerId)
      } catch {
        /* ignore */
      }
    }
    panRef.current = null
    if (didPanRef.current) {
      window.setTimeout(() => {
        didPanRef.current = false
      }, 0)
    }
  }

  return (
    <nav className="bottom-nav" aria-label="メイン">
      <button
        type="button"
        className={`nav-item nav-item-fixed ${activeView === 'home' ? 'active' : ''}`}
        onClick={onHome}
      >
        <div className="nav-dot" style={{ background: '#0f172a' }} />
        <span className="nav-item-label">ホーム</span>
      </button>

      <div
        ref={scrollRef}
        className={`nav-reorder${scrollArmed ? ' is-scroll-armed' : ''}${
          reorderArmedId ? ' is-reorder-armed' : ''
        }`}
        tabIndex={0}
        aria-label="項目。PCはクリック後に横スクロール、ダブルクリック後に並べ替え"
        onClick={() => setScrollArmed(true)}
        onWheel={(e) => {
          const el = scrollRef.current
          if (!el) return
          if (!scrollArmed && Math.abs(e.deltaX) < 1) return
          const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY
          if (dx === 0) return
          el.scrollLeft += dx
          e.preventDefault()
          setScrollArmed(true)
        }}
        onPointerDown={(e) => {
          if (!isMousePointer(e) || e.button !== 0) return
          if (reorderArmedId) return
          if (!scrollArmed) return
          const el = scrollRef.current
          if (!el) return
          // クリック遷移を妨げないよう、capture は動かしてから開始
          panRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startScroll: el.scrollLeft,
            active: false,
          }
        }}
        onPointerMove={(e) => {
          const pan = panRef.current
          const el = scrollRef.current
          if (!pan || !el || pan.pointerId !== e.pointerId) return
          if (reorderArmedId) return
          const dx = e.clientX - pan.startX
          if (!pan.active) {
            if (Math.abs(dx) < PAN_START_PX) return
            pan.active = true
            didPanRef.current = true
            try {
              el.setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
          }
          el.scrollLeft = pan.startScroll - dx
        }}
        onPointerUp={(e) => endPan(e.pointerId)}
        onPointerCancel={() => endPan()}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null
          if (next && e.currentTarget.contains(next)) return
          setScrollArmed(false)
        }}
      >
        <Reorder.Group
          as="div"
          axis="x"
          values={spaceIds}
          onReorder={onReorder}
          className="nav-reorder-track"
        >
          {spaces.map((s) => (
            <SpaceNavItem
              key={s.id}
              space={s}
              active={activeView === 'space' && activeSpaceId === s.id}
              reorderArmed={reorderArmedId === s.id}
              onSelect={() => onSpace(s.id)}
              onArmReorder={() => setReorderArmedId(s.id)}
              onReorderEnd={() => setReorderArmedId(null)}
              shouldSuppressClick={() => didPanRef.current}
            />
          ))}
        </Reorder.Group>
      </div>

      <button
        type="button"
        className={`nav-item nav-item-fixed ${activeView === 'settings' ? 'active' : ''}`}
        onClick={onSettings}
      >
        <div className="nav-dot" style={{ background: '#0f172a' }} />
        <span className="nav-item-label">設定</span>
      </button>
    </nav>
  )
}
