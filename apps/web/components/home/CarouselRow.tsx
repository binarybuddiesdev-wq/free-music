'use client'
import { useEffect, useRef } from 'react'

interface CarouselRowProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function CarouselRow({ children, style }: CarouselRowProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let pointerId: number | null = null
    let startX = 0
    let startScroll = 0
    let dragged = false
    let suppressClick = false

    // Mouse drag-to-scroll; native touch scrolling is left alone.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if (el.scrollWidth <= el.clientWidth + 1) return

      // If the pointer is over the horizontal scrollbar area, let native scrollbar handle it
      const rect = el.getBoundingClientRect()
      if (e.clientY >= rect.top + el.clientHeight) return

      dragged = false
      suppressClick = false
      pointerId = e.pointerId
      startX = e.clientX
      startScroll = el.scrollLeft
    }
    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      const dx = e.clientX - startX
      if (!dragged && Math.abs(dx) > 6) {
        dragged = true
        el.setPointerCapture(pointerId)
        el.classList.add('hscroll-dragging')
        el.style.scrollBehavior = 'auto'
        el.style.scrollSnapType = 'none'
      }
      if (dragged) {
        el.scrollLeft = startScroll - dx
        suppressClick = true
      }
    }
    const stopDrag = (e?: PointerEvent) => {
      if (pointerId !== null && dragged) {
        suppressClick = true
      }
      if (pointerId !== null) {
        try { el.releasePointerCapture(pointerId) } catch { /* already released */ }
        pointerId = null
        el.classList.remove('hscroll-dragging')
        el.style.scrollBehavior = ''
        el.style.scrollSnapType = ''
      }
    }
    // Don't play a card after the user just dragged the row
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false
        e.preventDefault()
        e.stopPropagation()
      }
    }
    // Convert vertical wheel over the row into horizontal scroll
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', stopDrag)
    el.addEventListener('pointercancel', stopDrag)
    el.addEventListener('pointerleave', stopDrag)
    el.addEventListener('click', onClickCapture, true)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', stopDrag)
      el.removeEventListener('pointercancel', stopDrag)
      el.removeEventListener('pointerleave', stopDrag)
      el.removeEventListener('click', onClickCapture, true)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="hscroll"
      style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        scrollBehavior: 'smooth', scrollSnapType: 'x mandatory',
        paddingBottom: 10, margin: '0 -24px',
        paddingLeft: 24, paddingRight: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}