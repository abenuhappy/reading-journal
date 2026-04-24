import { useState, useEffect, useRef, useMemo } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore, collection, doc, setDoc, deleteDoc, getDocs, query, orderBy,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyADb0O0DXiCxTMQw9atFnM1WpQs2LXvrSE",
  authDomain: "reading-journal-bd425.firebaseapp.com",
  projectId: "reading-journal-bd425",
  storageBucket: "reading-journal-bd425.firebasestorage.app",
  messagingSenderId: "684736504672",
  appId: "1:684736504672:web:7905485b508d70aa51f405",
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db   = getFirestore(app)
const provider = new GoogleAuthProvider()

/* ── Firebase 헬퍼 */
const loadBooks = async () => {
  const snap = await getDocs(query(collection(db, 'books'), orderBy('startDate', 'desc')))
  return snap.docs.map(d => d.data())
}

/** 시작일(ISO 날짜) 기준 내림차순. 시작일 없음은 맨 뒤. */
const sortBooksByStartDateDesc = (list) => [...list].sort((a, b) => {
  const as = (a.startDate && String(a.startDate).trim()) ? a.startDate : ''
  const bs = (b.startDate && String(b.startDate).trim()) ? b.startDate : ''
  if (!as && !bs) return 0
  if (!as) return 1
  if (!bs) return -1
  return String(bs).localeCompare(String(as))
})
const saveBook   = async (book)   => setDoc(doc(db, 'books', String(book.id)), book)
const removeBook = async (bookId) => deleteDoc(doc(db, 'books', String(bookId)))

/* ── 상수 */
const STATUS_LABELS = { want: '읽고 싶음', reading: '읽는 중', completed: '완독' }
const STATUS_ORDER  = ['reading', 'completed', 'want']
const STATUS_META   = {
  reading:   { label: '읽는 중',   hint: 'Currently Reading', cssVar: '--status-reading-fg' },
  completed: { label: '완독',      hint: 'Finished',          cssVar: '--status-done-fg' },
  want:      { label: '읽고 싶음', hint: 'Want to Read',      cssVar: '--status-want-fg' },
}
/** 필터·폼 등에서 선택된 탭/버튼에 쓰는 상태별 배경·글자색 */
const STATUS_CHIP_STYLE = {
  reading:   { background: 'var(--status-reading-bg)', color: 'var(--status-reading-fg)' },
  completed: { background: 'var(--status-done-bg)',    color: 'var(--status-done-fg)' },
  want:      { background: 'var(--status-want-bg)',    color: 'var(--status-want-fg)' },
}

/* ── 테마 유틸 */
const THEMES  = [['paper','종이'],['library','서재'],['minimal','미니멀']]
const LAYOUTS = [['shelf','책장'],['grid','그리드'],['list','리스트']]

const loadTweaks = () => {
  try { return JSON.parse(localStorage.getItem('dokseorok_tweaks') || 'null') } catch { return null }
}
const DEFAULT_TWEAKS = { theme: 'paper', layout: 'grid' }

/* ─────────────────────────────────────────────
   공통 UI 컴포넌트
───────────────────────────────────────────── */

/* 별점 */
const StarRating = ({ value = 0, onChange, readonly = false, size = 18 }) => {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1,2,3,4,5].map(s => {
        const filled = s <= (hover || value)
        return (
          <button
            key={s} type="button"
            disabled={readonly}
            onClick={() => onChange?.(s === value ? 0 : s)}
            onMouseEnter={() => !readonly && setHover(s)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform leading-none`}
            style={{ fontSize: size, color: filled ? 'var(--accent)' : 'var(--muted-border)' }}
          >★</button>
        )
      })}
    </div>
  )
}

/* 생성형 책 표지 */
const BookCover = ({ book, w = 120, h = 180, shadow = true }) => {
  const coverColor  = book.coverColor  || '#8b2c1e'
  const coverAccent = book.coverAccent || '#f4e4c1'
  const shadowStyle = shadow ? { boxShadow: '0 8px 18px rgba(30,20,10,.18), 0 2px 4px rgba(30,20,10,.1)' } : {}

  if (book.coverImage) {
    return (
      <img
        src={book.coverImage} alt={book.title}
        className="rounded-sm object-cover flex-shrink-0"
        style={{ width: w, height: h, ...shadowStyle }}
        onError={(e) => { e.target.style.display = 'none' }}
      />
    )
  }

  const wNum     = typeof w === 'number' && !Number.isNaN(w) ? w : 0
  const hNum     = typeof h === 'number' && !Number.isNaN(h) ? h : 0
  const isMicro  = wNum > 0 && wNum <= 40 && hNum > 0 && hNum <= 48

  if (isMicro) {
    return (
      <div
        className="relative rounded-sm overflow-hidden flex flex-col items-stretch flex-shrink-0"
        style={{ width: w, height: h, background: coverColor, color: coverAccent, ...shadowStyle }}
        title={book.title}
      >
        <div className="absolute inset-x-1 top-1 h-px opacity-40" style={{ background: coverAccent }} />
        <div className="flex-1 flex items-center justify-center px-0.5 py-0.5 min-h-0">
          <div
            className="font-serif leading-tight text-center w-full line-clamp-4"
            style={{ fontSize: 6, fontWeight: 600, wordBreak: 'keep-all' }}
          >
            {book.title}
          </div>
        </div>
      </div>
    )
  }

  const titleSize  = w < 100 ? 13 : w < 140 ? 15 : 18
  const authorSize = w < 100 ? 9  : 11

  return (
    <div
      className="relative rounded-sm overflow-hidden flex flex-col justify-between flex-shrink-0"
      style={{ width: w, height: h, background: coverColor, color: coverAccent, ...shadowStyle }}
    >
      {/* 상단 장식 선 */}
      <div className="absolute inset-x-3 top-3 h-px opacity-50"  style={{ background: coverAccent }} />
      <div className="absolute inset-x-3 top-4 h-px opacity-25" style={{ background: coverAccent }} />
      <div className="pt-8 px-3 flex-1 flex items-center">
        <div className="font-serif leading-tight" style={{ fontSize: titleSize, fontWeight: 600, wordBreak: 'keep-all' }}>
          {book.title}
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="absolute inset-x-3 bottom-8 h-px opacity-25" style={{ background: coverAccent }} />
        <div className="absolute inset-x-3 bottom-7 h-px opacity-50"  style={{ background: coverAccent }} />
        <div className="pt-3 opacity-80" style={{ fontSize: authorSize, letterSpacing: '0.08em' }}>
          {(book.author || '').toUpperCase()}
        </div>
      </div>
    </div>
  )
}

/* 상태 배지 */
const StatusBadge = ({ status, small = false, list = false }) => {
  const styles = {
    want:      { bg: 'var(--status-want-bg)',    fg: 'var(--status-want-fg)' },
    reading:   { bg: 'var(--status-reading-bg)', fg: 'var(--status-reading-fg)' },
    completed: { bg: 'var(--status-done-bg)',    fg: 'var(--status-done-fg)' },
  }[status] || { bg: '#eee', fg: '#555' }
  const label = STATUS_LABELS[status]
  if (list) {
    return (
      <span
        title={label}
        className={`inline-block max-w-[52px] truncate rounded-full font-medium py-[2px] px-[6px] whitespace-nowrap ${status === 'want' ? 'text-[9px]' : 'text-[10px]'}`}
        style={{ background: styles.bg, color: styles.fg, letterSpacing: status === 'want' ? '-0.04em' : '-0.01em' }}
      >
        {label}
      </span>
    )
  }
  return (
    <span
      className={`inline-block rounded-full font-medium ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: styles.bg, color: styles.fg, letterSpacing: '-0.01em' }}
    >
      {label}
    </span>
  )
}

/* 버튼 */
const Btn = ({ variant = 'primary', children, className = '', style: extStyle = {}, ...p }) => {
  const base = 'px-3 py-2 rounded-lg font-medium text-sm transition-all active:scale-[0.98] whitespace-nowrap'
  let style = {}
  if (variant === 'primary') style = { background: 'var(--fg)', color: 'var(--bg)' }
  else if (variant === 'outline') style = { border: '1px solid var(--border)', color: 'var(--fg)' }
  else if (variant === 'ghost')   style = { color: 'var(--fg)' }
  else if (variant === 'danger')  style = { color: '#ef4444' }
  return (
    <button {...p} className={`${base} ${className}`} style={{ ...style, ...extStyle }}>
      {children}
    </button>
  )
}

/* 통계 카드 */
const StatCard = ({ label, value, hint, accent }) => (
  <div className="py-4 px-5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
    <div className="flex items-baseline gap-2">
      <div className="font-serif" style={{ fontSize: 32, fontWeight: 500, color: accent || 'var(--fg)', lineHeight: 1 }}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
        {label}
      </div>
    </div>
    {hint && <div className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{hint}</div>}
  </div>
)

/* ─────────────────────────────────────────────
   레이아웃 뷰 (Shelf / Grid / List)
───────────────────────────────────────────── */

/* 책장 뷰 */
const ShelfView = ({ books, onSelect }) => {
  const shelves = []
  for (let i = 0; i < books.length; i += 6) shelves.push(books.slice(i, i + 6))
  return (
    <div className="space-y-10">
      {shelves.map((row, idx) => (
        <div key={idx} className="relative">
          <div className="flex items-end gap-4 pb-3 min-h-[240px] px-2">
            {row.map(b => {
              const h = 200 + ((b.pages || 200) % 40)
              return (
                <div
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="cursor-pointer transition-all hover:-translate-y-2"
                  style={{ transform: `rotate(${((b.id * 7) % 5) - 2}deg)` }}
                >
                  <BookCover book={b} w={136} h={h} />
                </div>
              )
            })}
          </div>
          <div className="h-2 rounded-sm"   style={{ background: 'var(--shelf)',      boxShadow: '0 2px 3px rgba(0,0,0,.15) inset' }} />
          <div className="h-3 rounded-b-sm" style={{ background: 'var(--shelf-deep)' }} />
        </div>
      ))}
    </div>
  )
}

/* 그리드 뷰 */
const GridView = ({ books, onSelect }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
    {books.map(b => (
      <div key={b.id} onClick={() => onSelect(b)} className="cursor-pointer group book-card-hover">
        <div className="mb-3 transition-transform group-hover:-translate-y-1">
          <BookCover book={b} w="100%" h={220} />
        </div>
        <div className="space-y-1">
          <div className="font-serif text-[15px] leading-tight" style={{ color: 'var(--fg)', wordBreak: 'keep-all' }}>
            {b.title}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{b.author}</div>
          <div className="flex items-center justify-between pt-1">
            <StatusBadge status={b.status} small />
            {b.rating > 0 && <StarRating value={b.rating} readonly size={11} />}
          </div>
        </div>
      </div>
    ))}
  </div>
)

/* 리스트 뷰 (모바일 컴팩트: 기간은 제목·저자 열, 표지 30×42) */
const formatDateYyMmDd = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso || ''
  return `${m[1].slice(-2)}/${m[2]}/${m[3]}`
}
/** want: 없음 / reading: 시작만 / completed: 시작~종료 */
const formatListBookDateLine = (b) => {
  if (b.status === 'want') return ''
  const s = b.startDate ? formatDateYyMmDd(b.startDate) : ''
  const e = b.endDate ? formatDateYyMmDd(b.endDate) : ''
  if (b.status === 'reading') return s
  if (b.status === 'completed') {
    if (s && e) return `${s}~${e}`
    return s || e || ''
  }
  return s || e || ''
}
const LIST_VIEW_GRID = '30px minmax(0,1fr) 52px 2.5rem 3.5rem'
const ListView = ({ books, onSelect }) => (
  <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
    <div
      className="grid gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 text-[10px] uppercase tracking-widest border-b items-center"
      style={{ gridTemplateColumns: LIST_VIEW_GRID, color: 'var(--muted)', borderColor: 'var(--border)', letterSpacing: '0.14em' }}
    >
      <div className="w-[30px]" />
      <div>제목 · 저자</div>
      <div className="text-center">상태</div>
      <div className="text-center">평점</div>
      <div className="text-right">페이지</div>
    </div>
    {books.map((b, i) => {
      const dateLine = formatListBookDateLine(b)
      return (
      <div
        key={b.id}
        onClick={() => onSelect(b)}
        className="grid gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 items-center cursor-pointer transition-colors"
        style={{
          gridTemplateColumns: LIST_VIEW_GRID,
          borderBottom: i < books.length - 1 ? '1px solid var(--border)' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <BookCover book={b} w={30} h={42} shadow={false} />
        <div className="min-w-0">
          <div
            className="font-serif text-[12px] sm:text-[13px] leading-tight font-medium truncate"
            style={{ color: 'var(--fg)' }}
          >
            {b.title}
          </div>
          <div className="text-[11px] leading-snug mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
            {b.author}{b.genre ? ` · ${b.genre}` : ''}
          </div>
          {dateLine && (
            <div className="text-[10px] tabular-nums leading-none mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              {dateLine}
            </div>
          )}
        </div>
        <div className="flex justify-center w-[52px] justify-self-center min-w-0">
          <StatusBadge status={b.status} list />
        </div>
        <div className="text-center text-[12px] font-semibold tabular-nums min-w-0" style={{ color: 'var(--fg)' }}>
          {b.rating > 0
            ? b.rating.toFixed(1)
            : <span className="text-[11px] font-normal" style={{ color: 'var(--muted)' }}>—</span>}
        </div>
        <div className="text-[11px] sm:text-xs tabular-nums text-right" style={{ color: 'var(--muted)' }}>
          {b.status === 'reading' && b.currentPage ? `${b.currentPage} / ${b.pages || '?'}` : b.pages || '—'}
        </div>
      </div>
      )
    })}
  </div>
)

/* ─────────────────────────────────────────────
   목록 화면 (LibraryView)
───────────────────────────────────────────── */
const LibraryView = ({ books, onSelect, layout, search, setSearch, filter, setFilter, onAdd, isOwner }) => {
  const stats = useMemo(() => {
    const completed = books.filter(b => b.status === 'completed')
    const rated     = books.filter(b => b.rating > 0)
    return {
      total:     books.length,
      completed: completed.length,
      reading:   books.filter(b => b.status === 'reading').length,
      want:      books.filter(b => b.status === 'want').length,
      pages:     completed.reduce((s, b) => s + (b.pages || 0), 0),
      avgRating: rated.length
        ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
        : 0,
    }
  }, [books])

  const filtered = useMemo(() => books.filter(b => {
    const q  = search.trim().toLowerCase()
    const mq = !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)
    const ms = filter === 'all' || b.status === filter
    return mq && ms
  }), [books, search, filter])

  const View = { shelf: ShelfView, grid: GridView, list: ListView }[layout] || GridView

  const grouped = STATUS_ORDER
    .map(s => ({ status: s, books: filtered.filter(b => b.status === s) }))
    .filter(g => g.books.length > 0)

  return (
    <div className="space-y-8 fade-in">
      {/* 히어로 */}
      <div className="flex items-end justify-between pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-xs uppercase tracking-[.2em] mb-2" style={{ color: 'var(--muted)' }}>
            2026 · READING JOURNAL
          </div>
          <h1 className="font-serif" style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, letterSpacing: '-.02em' }}>
            나의 독서록
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
            올해 지금까지 <b style={{ color: 'var(--fg)' }}>{stats.completed}권</b>을 완독하고,{' '}
            <b style={{ color: 'var(--fg)' }}>{stats.pages.toLocaleString()}쪽</b>을 지나왔습니다.
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Books" value={stats.total}
          hint={`완독 ${stats.completed} · 진행 ${stats.reading} · 예정 ${stats.want}`}
        />
        <StatCard label="Pages" value={stats.pages.toLocaleString()} hint="완독 기준 총 쪽수" accent="var(--accent)" />
        <StatCard label="Rating" value={stats.avgRating || '—'} hint="평균 별점 (5점 만점)" accent="var(--accent)" />
        <StatCard label="Reading" value={stats.reading} hint="지금 읽는 중" />
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted)' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목이나 저자로 검색"
            className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
              style={{ color: 'var(--muted)' }}
            >×</button>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {[['all','전체'],['reading','읽는 중'],['completed','완독'],['want','읽고 싶음']].map(([k, v]) => (
            <button
              key={k} onClick={() => setFilter(k)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={filter === k
                ? (STATUS_CHIP_STYLE[k] || { background: 'var(--fg)', color: 'var(--bg)' })
                : { color: 'var(--muted)' }}
            >
              {v}
              {k !== 'all' && (
                <span className="ml-1 opacity-60">({books.filter(b => b.status === k).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
          <div className="font-serif italic text-lg">아직 책이 없습니다</div>
          <div className="text-sm mt-1">첫 책을 더해보세요.</div>
        </div>
      ) : filter === 'all' ? (
        /* 전체: 상태별 섹션 분리 */
        <div className="space-y-14">
          {grouped.map(g => {
            const meta = STATUS_META[g.status]
            return (
              <section key={g.status} className="space-y-5">
                <div className="flex items-baseline gap-4">
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0 translate-y-px"
                        style={{ backgroundColor: `var(${meta.cssVar})` }}
                        title={meta.label}
                        aria-hidden
                      />
                      <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--fg)' }}>
                        {meta.label}
                      </h2>
                      <span className="font-mono tabular-nums text-sm" style={{ color: `var(${meta.cssVar})` }}>
                        {String(g.books.length).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[.2em] mt-1" style={{ color: 'var(--muted)' }}>
                      {meta.hint}
                    </div>
                  </div>
                  <div className="flex-1 h-px self-center" style={{ background: 'var(--border)' }} />
                </div>
                <View books={g.books} onSelect={onSelect} />
              </section>
            )
          })}
        </div>
      ) : (
        /* 개별 필터: 단순 뷰 */
        <View books={filtered} onSelect={onSelect} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   책 상세 화면
───────────────────────────────────────────── */
const ProgressBar = ({ pct }) => (
  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
  </div>
)

const BookDetail = ({ book, onBack, onEdit, onDelete, isOwner }) => {
  const readingDays = book.startDate && book.endDate
    ? Math.max(1, Math.ceil((new Date(book.endDate) - new Date(book.startDate)) / 86400000) + 1)
    : null
  const pagesPerDay = readingDays && book.pages ? Math.round(book.pages / readingDays) : null
  const progress    = book.status === 'reading' && book.pages && book.currentPage
    ? Math.round((book.currentPage / book.pages) * 100)
    : book.status === 'completed' ? 100 : 0

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <button onClick={onBack} className="text-sm mb-8 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
        ← 서재로
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 mb-12">
        <div className="flex justify-center md:block">
          <BookCover book={book} w={200} h={300} />
        </div>
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={book.status} />
              {book.genre && (
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  {book.genre}
                </span>
              )}
            </div>
            <h1 className="font-serif" style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 500, letterSpacing: '-.02em', wordBreak: 'keep-all' }}>
              {book.title}
            </h1>
            {book.author && <p className="text-lg mt-2" style={{ color: 'var(--muted)' }}>{book.author}</p>}
          </div>

          {book.rating > 0 && (
            <div className="flex items-center gap-3">
              <StarRating value={book.rating} readonly size={22} />
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{book.rating}.0 / 5.0</span>
            </div>
          )}

          {book.status === 'reading' && book.pages && (
            <div className="space-y-2 max-w-md">
              <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                <span>진행률</span>
                <span className="tabular-nums">{book.currentPage} / {book.pages} 쪽 · {progress}%</span>
              </div>
              <ProgressBar pct={progress} />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: '시작',   val: book.startDate || '—' },
              { label: '완독',   val: book.endDate   || '—' },
              { label: '쪽수',   val: book.pages     || '—' },
              { label: readingDays ? '소요' : '하루 평균',
                val:  readingDays ? `${readingDays}일` : pagesPerDay ? `${pagesPerDay}쪽` : '—' },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted)', letterSpacing: '.14em' }}>
                  {label}
                </div>
                <div className="text-sm tabular-nums">{val}</div>
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex gap-2 pt-2">
              <Btn variant="outline" onClick={onEdit}>수정</Btn>
              <Btn variant="danger"  onClick={onDelete}>삭제</Btn>
            </div>
          )}
        </div>
      </div>

      {/* 메모 */}
      {book.memos?.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 500 }}>책 속에서</h2>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {book.memos.length} NOTES
            </span>
          </div>
          <div className="space-y-5">
            {book.memos.map(m => (
              <figure key={m.id} className="grid gap-6 items-start py-2" style={{ gridTemplateColumns: '60px 1fr' }}>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>p.</div>
                  <div className="font-serif tabular-nums" style={{ fontSize: 20, color: 'var(--fg)' }}>{m.page}</div>
                </div>
                <blockquote
                  className="font-serif italic pl-6"
                  style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--fg)', borderLeft: '2px solid var(--accent)', wordBreak: 'keep-all' }}
                >
                  {m.content}
                </blockquote>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* 느낀 점 */}
      {book.feelings && (
        <section className="mb-12">
          <h2 className="font-serif mb-6" style={{ fontSize: 24, fontWeight: 500 }}>느낀 점</h2>
          <div className="rounded-xl p-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="whitespace-pre-wrap" style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)' }}>
              {book.feelings}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   책 등록/수정 폼
───────────────────────────────────────────── */
const COVER_PALETTES = [
  { c: '#8b2c1e', a: '#f4e4c1' },
  { c: '#1e3a5f', a: '#e8d9b5' },
  { c: '#2d3e2e', a: '#d4c27a' },
  { c: '#5b3c8c', a: '#f2cf5e' },
  { c: '#eae3d2', a: '#1a1a1a' },
  { c: '#0b1e3a', a: '#c9b356' },
  { c: '#b8c5a8', a: '#4a2f2f' },
  { c: '#f3e4a8', a: '#8c4a1e' },
]

const BookForm = ({ book, onSave, onCancel }) => {
  const isEdit = !!book?.id
  const [form, setForm] = useState(() => book ?? {
    title: '', author: '', coverImage: '', coverColor: '#8b2c1e', coverAccent: '#f4e4c1',
    startDate: '', endDate: '', status: 'want', rating: 0,
    pages: '', currentPage: '', genre: '', memos: [], feelings: '',
  })
  const [urlInput, setUrlInput] = useState(book?.coverImage?.startsWith('http') ? book.coverImage : '')
  const [saving, setSaving]     = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert('이미지는 3MB 이하만 가능합니다.'); return }
    const reader = new FileReader()
    reader.onload = ev => { set('coverImage', ev.target.result); setUrlInput('') }
    reader.readAsDataURL(file)
  }

  const addMemo    = () => set('memos', [...form.memos, { id: Date.now(), page: '', content: '' }])
  const updateMemo = (id, u) => set('memos', form.memos.map(m => m.id === id ? u : m))
  const deleteMemo = (id)    => set('memos', form.memos.filter(m => m.id !== id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { alert('책 제목을 입력해 주세요.'); return }
    setSaving(true)
    await onSave({
      ...form,
      pages:       form.pages       ? Number(form.pages)       : 0,
      currentPage: form.currentPage ? Number(form.currentPage) : 0,
      id:          form.id       ?? Date.now(),
      createdAt:   form.createdAt ?? Date.now(),
    })
    setSaving(false)
  }

  const inputStyle = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg)', boxSizing: 'border-box', maxWidth: '100%', WebkitAppearance: 'none' }
  const inputCls   = 'w-full min-w-0 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors'
  const labelStyle = { color: 'var(--muted)', letterSpacing: '0.12em' }
  const labelCls   = 'block text-xs uppercase tracking-widest mb-1.5'

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <button onClick={onCancel} className="text-sm mb-6 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
        ← 돌아가기
      </button>
      <h1 className="font-serif mb-10" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-.02em' }}>
        {isEdit ? '책 수정' : '새 책 더하기'}
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10">
        {/* 왼쪽 — 표지 */}
        <div className="space-y-4">
          <BookCover book={form} w={180} h={270} />
          {/* 팔레트 */}
          <div>
            <div className={labelCls} style={labelStyle}>표지 색상</div>
            <div className="grid grid-cols-4 gap-2">
              {COVER_PALETTES.map(p => (
                <button
                  key={p.c} type="button"
                  onClick={() => { set('coverColor', p.c); set('coverAccent', p.a); set('coverImage', ''); setUrlInput('') }}
                  className="h-10 rounded-md transition-all"
                  style={{
                    background: p.c,
                    outline: form.coverColor === p.c ? '2px solid var(--fg)' : '1px solid var(--border)',
                    outlineOffset: form.coverColor === p.c ? 2 : 0,
                  }}
                />
              ))}
            </div>
          </div>
          {/* 이미지 업로드 */}
          <div className="space-y-2">
            <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-2 rounded-lg text-xs"
              style={{ border: '1px dashed var(--border)', color: 'var(--muted)' }}>
              이미지 업로드
            </button>
            <input
              type="url" placeholder="또는 이미지 URL 입력..." value={urlInput}
              onChange={e => { setUrlInput(e.target.value); set('coverImage', e.target.value) }}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
              style={inputStyle}
            />
            {form.coverImage && (
              <button type="button"
                onClick={() => { set('coverImage', ''); setUrlInput(''); if (fileRef.current) fileRef.current.value = '' }}
                className="text-xs" style={{ color: '#ef4444' }}>
                ✕ 이미지 제거
              </button>
            )}
          </div>
        </div>

        {/* 오른쪽 — 필드 */}
        <div className="space-y-5 min-w-0 overflow-hidden">
          <div>
            <label className={labelCls} style={labelStyle}>제목 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className={`${inputCls} font-serif text-lg`} style={inputStyle} placeholder="책 제목" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>저자</label>
              <input value={form.author} onChange={e => set('author', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>장르</label>
              <input value={form.genre} onChange={e => set('genre', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="한국 소설 / 에세이 …" />
            </div>
          </div>

          {/* 독서 상태 */}
          <div>
            <label className={labelCls} style={labelStyle}>독서 상태</label>
            <div className="flex gap-2">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set('status', k)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={form.status === k
                    ? STATUS_CHIP_STYLE[k]
                    : { background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden">
            <div className="min-w-0">
              <label className={labelCls} style={labelStyle}>시작일</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="min-w-0">
              <label className={labelCls} style={labelStyle}>완독일</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>전체 쪽수</label>
              <input type="number" value={form.pages} onChange={e => set('pages', e.target.value)} className={inputCls} style={inputStyle} placeholder="0" />
            </div>
            {form.status === 'reading' && (
              <div>
                <label className={labelCls} style={labelStyle}>현재 쪽</label>
                <input type="number" value={form.currentPage} onChange={e => set('currentPage', e.target.value)} className={inputCls} style={inputStyle} placeholder="0" />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>평점</label>
            <StarRating value={form.rating} onChange={v => set('rating', v)} size={26} />
          </div>

          {/* 메모 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls} style={labelStyle}>책 속 메모 · {form.memos.length}</label>
              <button type="button" onClick={addMemo} className="text-xs" style={{ color: 'var(--accent)' }}>+ 추가</button>
            </div>
            {form.memos.length === 0 ? (
              <div className="text-center py-6 rounded-lg text-xs" style={{ border: '1px dashed var(--border)', color: 'var(--muted)' }}>
                인상 깊은 구절을 적어두세요
              </div>
            ) : (
              <div className="space-y-2">
                {form.memos.map(m => (
                  <div key={m.id} className="grid gap-2 items-start p-3 rounded-lg"
                    style={{ gridTemplateColumns: '70px 1fr auto', background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <input type="number" value={m.page} placeholder="쪽"
                      onChange={e => updateMemo(m.id, { ...m, page: e.target.value })}
                      className="rounded px-2 py-1.5 text-sm text-center outline-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
                    <textarea value={m.content} placeholder="인용구 또는 메모…" rows={2}
                      onChange={e => updateMemo(m.id, { ...m, content: e.target.value })}
                      className="rounded px-2 py-1.5 text-sm outline-none resize-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
                    <button type="button" onClick={() => deleteMemo(m.id)}
                      className="text-lg px-1.5" style={{ color: 'var(--muted)' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>느낀 점</label>
            <textarea value={form.feelings} onChange={e => set('feelings', e.target.value)} rows={6}
              className={`${inputCls} resize-none font-serif`}
              style={{ ...inputStyle, fontSize: 15, lineHeight: 1.7 }}
              placeholder="책을 읽고 남기고 싶은 생각을 자유롭게…" />
          </div>

          <div className="flex gap-3 pt-2">
            <Btn type="button" variant="outline" onClick={onCancel} className="flex-1">취소</Btn>
            <Btn type="submit" variant="primary" disabled={saving}
              className="flex-[2]" style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '책장에 꽂기'}
            </Btn>
          </div>
        </div>
      </form>
    </div>
  )
}

/* ─────────────────────────────────────────────
   테마/레이아웃 패널
───────────────────────────────────────────── */
const TweaksPanel = ({ open, tweaks, setTweak }) => {
  if (!open) return null
  return (
    <div
      className="fixed bottom-5 right-5 z-[110] rounded-xl p-4 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,.15)', minWidth: 240 }}
    >
      <div className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--muted)', letterSpacing: '.15em' }}>
        TWEAKS
      </div>
      {[
        { label: '테마',    key: 'theme',  opts: THEMES },
        { label: '레이아웃', key: 'layout', opts: LAYOUTS },
      ].map(({ label, key, opts }) => (
        <div key={key}>
          <div className="text-xs mb-2" style={{ color: 'var(--fg)' }}>{label}</div>
          <div className="flex gap-1">
            {opts.map(([k, v]) => (
              <button key={k} onClick={() => setTweak(key, k)}
                className="flex-1 py-2 rounded text-xs transition-all"
                style={tweaks[key] === k
                  ? { background: 'var(--fg)', color: 'var(--bg)' }
                  : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   메인 App
───────────────────────────────────────────── */
const App = () => {
  const [user,         setUser]         = useState(null)
  const [authLoading,  setAuthLoading]  = useState(true)
  const [books,        setBooks]        = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [view,         setView]         = useState('library')
  const [selectedBook, setSelectedBook] = useState(null)
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [tweaks,       setTweaks]       = useState(() => ({ ...DEFAULT_TWEAKS, ...(loadTweaks() || {}) }))
  const [tweaksOpen,   setTweaksOpen]   = useState(false)

  /* Firebase 초기화 */
  useEffect(() => {
    loadBooks().then(loaded => { setBooks(loaded); setBooksLoading(false) })
  }, [])
  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
  }, [])

  /* 테마 DOM 동기화 */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme)
  }, [tweaks.theme])

  const setTweak = (k, v) => {
    setTweaks(prev => {
      const next = { ...prev, [k]: v }
      localStorage.setItem('dokseorok_tweaks', JSON.stringify(next))
      return next
    })
  }

  const handleLogin  = async () => {
    try { await signInWithPopup(auth, provider) }
    catch (e) { if (e.code !== 'auth/popup-closed-by-user') alert('로그인 실패: ' + e.message) }
  }
  const handleLogout = async () => { await signOut(auth); goLibrary() }

  const goLibrary = () => { setView('library'); setSelectedBook(null) }
  const goDetail  = (b)  => { setSelectedBook(b); setView('detail') }

  const handleSave = async (book) => {
    await saveBook(book)
    if (view === 'edit') {
      setBooks(prev => prev.map(b => b.id === book.id ? book : b))
      setSelectedBook(book)
      setView('detail')
    } else {
      setBooks(prev => [book, ...prev])
      goLibrary()
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${selectedBook.title}"을(를) 삭제할까요?`)) return
    await removeBook(selectedBook.id)
    setBooks(prev => prev.filter(b => b.id !== selectedBook.id))
    goLibrary()
  }

  const isOwner = user?.uid === 'tuIXqYWofGa39ujsoPvcVrviXUC2'

  const booksSorted = useMemo(() => sortBooksByStartDateDesc(books), [books])

  if (booksLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-grad)' }}>
      <div className="font-serif text-2xl animate-pulse" style={{ color: 'var(--muted)' }}>독서록</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={goLibrary} className="flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <span className="font-serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.01em' }}>독서록</span>
            <span className="text-[10px] uppercase tracking-widest font-mono hidden sm:inline"
              style={{ color: 'var(--muted)', letterSpacing: '.2em' }}>
              READING · JOURNAL
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{booksSorted.length} books</span>
            {/* 테마 토글 버튼 */}
            <button
              onClick={() => setTweaksOpen(o => !o)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={tweaksOpen
                ? { background: 'var(--fg)', color: 'var(--bg)' }
                : { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              ⊞ 테마
            </button>
            {!authLoading && (
              isOwner
                ? <button onClick={handleLogout}
                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--muted)' }}>
                    로그아웃
                  </button>
                : <button onClick={handleLogin}
                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--muted)' }}>
                    관리자
                  </button>
            )}
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {view === 'library' && (
          <LibraryView
            books={booksSorted}
            onSelect={goDetail}
            layout={tweaks.layout}
            search={search} setSearch={setSearch}
            filter={filter} setFilter={setFilter}
            onAdd={() => setView('add')}
            isOwner={isOwner}
          />
        )}
        {view === 'detail' && selectedBook && (
          <BookDetail
            book={selectedBook}
            onBack={goLibrary}
            onEdit={() => setView('edit')}
            onDelete={handleDelete}
            isOwner={isOwner}
          />
        )}
        {view === 'add' && isOwner && (
          <BookForm onSave={handleSave} onCancel={goLibrary} />
        )}
        {view === 'edit' && selectedBook && isOwner && (
          <BookForm book={selectedBook} onSave={handleSave} onCancel={() => setView('detail')} />
        )}
      </main>

      {/* 플로팅 책 추가 버튼 (library 뷰 + 소유자만) */}
      {view === 'library' && isOwner && (
        <button
          onClick={() => setView('add')}
          aria-label="책 추가"
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 28,
            lineHeight: 1,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.24)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)' }}
        >
          ＋
        </button>
      )}

      {/* Tweaks 패널 */}
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweak={setTweak} />
    </div>
  )
}

export default App
