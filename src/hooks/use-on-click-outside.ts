import { useEffect } from 'react'

type Event = MouseEvent | TouchEvent

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null>,
  callback: (event: Event) => void,
  eventType: 'mousedown' | 'mouseup' | 'touchstart' | 'touchend' = 'mousedown',
) {
  useEffect(() => {
    const listener = (event: Event) => {
      const el = ref?.current

      if (!el || el.contains(event?.target as Node)) {
        return
      }

      callback(event)
    }

    document.addEventListener(eventType, listener)

    return () => {
      document.removeEventListener(eventType, listener)
    }
  }, [ref, callback, eventType])
}
