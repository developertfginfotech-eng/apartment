'use client'

import { useState, useEffect, useCallback } from 'react'

export function useTheme() {
  const [dark, setDarkState] = useState(true)

  useEffect(() => {
    const isLight = localStorage.getItem('apt_theme') === 'light'
    setDarkState(!isLight)
    // Re-apply the stored preference to the DOM on every mount — without this,
    // any fresh page load (a plain <a> navigation, a hard refresh, a
    // different route in this static-export site) always renders dark by
    // default until the toggle is clicked again on that specific page.
    if (isLight) document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  }, [])

  const setDark = useCallback((value: boolean) => {
    setDarkState(value)
    if (value) {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('apt_theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('apt_theme', 'light')
    }
  }, [])

  const toggle = useCallback(() => setDark(!dark), [dark, setDark])

  return { dark, setDark, toggle }
}
