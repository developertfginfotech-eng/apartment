'use client'

import { useState, useEffect, useCallback } from 'react'

export function useTheme() {
  const [dark, setDarkState] = useState(true)

  useEffect(() => {
    setDarkState(localStorage.getItem('apt_theme') !== 'light')
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
