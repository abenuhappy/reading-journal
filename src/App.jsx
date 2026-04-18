import { useState, useEffect, useRef } from 'react'
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

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const provider = new GoogleAuthProvider()

/* ── Firebase 헬퍼 ─────────────────────────── */
const loadBooks = async () => {
  const snap = await getDocs(query(collection(db, 'books'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => d.data())
}

const saveBook = async (book) => {
  await setDoc(doc(db, 'books', String(book.id)), book)
}

const removeBook = async (bookId) => {
  await deleteDoc(doc(db, 'books', String(bookId)))
}

/* ── 상수 ─────────────────────────────────── */
const STATUS_LABELS = { want: "읽고 싶음", reading: "읽는 중", completed: "완독" }
const STATUS_COLORS = {
  want:      "bg-sky-100 text-sky-700",
  reading:   "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
}

/* ── 빈 책 표지 ─────────────────────────── */
const DefaultCover = ({ title }) => {
  const bg = ["#f3e8d0","#dbeafe","#dcfce7","#fce7f3","#ede9fe"]
  const col = bg[title.charCodeAt(0) % bg.length]
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: col }}>
      <div className="text-center px-2">
        <div className="text-3xl mb-1">📖</div>
        <div className="text-xs font-bold text-gray-600 line-clamp-3 leading-snug">{title}</div>
      </div>
    </div>
  )
}

/* ── 별점 컴포넌트 ───────────────────────── */
const StarRating = ({ value = 0, onChange, readonly = false, size = "text-xl" }) => {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button
          key={s} type="button" disabled={readonly}
          onClick={() => onChange?.(s === value ? 0 : s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${size} transition-transform ${!readonly && "hover:scale-125 cursor-pointer"}
            ${s <= (hover || value) ? "text-amber-400" : "text-gray-200"}`}
        >★</button>
      ))}
    </div>
  )
}

/* ── 책 카드 ─────────────────────────────── */
const BookCard = ({ book, onClick }) => (
  <div
    onClick={() => onClick(book)}
    className="book-card bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer border border-amber-100"
  >
    {/* 고정 높이 + object-fit: cover 로 이미지 규격 통일 */}
    <div className="h-44 relative bg-gray-100">
      {book.coverImage
        ? <img src={book.coverImage} alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.target.style.display="none" }}
          />
        : null}
      {!book.coverImage && (
        <div className="absolute inset-0">
          <DefaultCover title={book.title} />
        </div>
      )}
    </div>
    <div className="p-3 space-y-1">
      {/* 배지를 정보 영역으로 이동 — 표지 색상과 무관하게 항상 선명하게 표시 */}
      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[book.status]}`}>
        {STATUS_LABELS[book.status]}
      </span>
      <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{book.title}</h3>
      {book.author && <p className="text-gray-400 text-xs">{book.author}</p>}
      <StarRating value={book.rating} readonly size="text-sm" />
      {book.startDate && (
        <p className="text-gray-400 text-xs">
          {book.startDate}{book.endDate ? ` ~ ${book.endDate}` : " ~"}
        </p>
      )}
      {book.memos?.length > 0 && (
        <p className="text-amber-500 text-xs">📝 메모 {book.memos.length}개</p>
      )}
    </div>
  </div>
)

/* ── 메모 아이템 ──────────────────────────── */
const MemoItem = ({ memo, onChange, onDelete }) => (
  <div className="flex gap-2 items-start bg-amber-50 p-3 rounded-xl border border-amber-100">
    <input
      type="number" placeholder="쪽" value={memo.page} min="1"
      onChange={(e) => onChange({ ...memo, page: e.target.value })}
      className="w-16 flex-shrink-0 border border-amber-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
    />
    <textarea
      placeholder="메모 내용을 입력하세요..."
      value={memo.content}
      onChange={(e) => onChange({ ...memo, content: e.target.value })}
      className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white"
      rows={2}
    />
    <button type="button" onClick={onDelete}
      className="flex-shrink-0 text-red-300 hover:text-red-500 transition-colors text-lg leading-none mt-1">
      ×
    </button>
  </div>
)

/* ── 책 등록/수정 폼 ─────────────────────── */
const BookForm = ({ book, onSave, onCancel }) => {
  const isEdit = !!book?.id
  const [form, setForm] = useState(() => book ?? {
    title:"", author:"", coverImage:"", startDate:"", endDate:"",
    status:"want", rating:0, memos:[], feelings:""
  })
  const [urlInput, setUrlInput] = useState(book?.coverImage?.startsWith("http") ? book.coverImage : "")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert("이미지는 3MB 이하만 가능합니다."); return }
    const reader = new FileReader()
    reader.onload = (ev) => { set("coverImage", ev.target.result); setUrlInput("") }
    reader.readAsDataURL(file)
  }

  const handleUrl = (url) => { setUrlInput(url); set("coverImage", url) }

  const addMemo = () => set("memos", [...form.memos, { id: Date.now(), page:"", content:"" }])
  const updateMemo = (id, updated) => set("memos", form.memos.map(m => m.id === id ? updated : m))
  const deleteMemo = (id) => set("memos", form.memos.filter(m => m.id !== id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { alert("책 제목을 입력해 주세요."); return }
    setSaving(true)
    await onSave({ ...form, id: form.id ?? Date.now(), createdAt: form.createdAt ?? Date.now() })
    setSaving(false)
  }

  return (
    <div className="max-w-xl mx-auto fade-in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 표지 */}
        <div className="flex gap-4 items-start">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-28 h-40 rounded-xl border-2 border-dashed border-amber-300 overflow-hidden cursor-pointer flex-shrink-0 bg-amber-50 hover:border-amber-400 transition-colors"
          >
            {form.coverImage
              ? <img src={form.coverImage} alt="표지" className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display="none" }}
                />
              : <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 gap-1">
                  <div className="text-3xl">📷</div>
                  <div className="text-xs">표지 추가</div>
                </div>
            }
          </div>
          <div className="flex-1 space-y-2.5 pt-1">
            <input type="file" ref={fileRef} accept="image/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-2 border border-amber-300 rounded-xl text-sm text-amber-700 hover:bg-amber-50 transition-colors">
              📁 파일 업로드
            </button>
            <input
              type="url" placeholder="이미지 URL 입력..." value={urlInput}
              onChange={(e) => handleUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            {form.coverImage && (
              <button type="button"
                onClick={() => { set("coverImage",""); setUrlInput(""); fileRef.current && (fileRef.current.value="") }}
                className="text-xs text-red-400 hover:text-red-600">
                ✕ 이미지 제거
              </button>
            )}
          </div>
        </div>

        {/* 제목·저자 */}
        <div className="space-y-2.5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">책 제목 <span className="text-red-400">*</span></label>
            <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="책 제목을 입력하세요"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">저자</label>
            <input type="text" value={form.author} onChange={(e) => set("author", e.target.value)}
              placeholder="저자명을 입력하세요"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm" />
          </div>
        </div>

        {/* 날짜 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">읽기 시작일</label>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">완독일</label>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm" />
          </div>
        </div>

        {/* 독서 상태 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">독서 상태</label>
          <div className="flex gap-2">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => set("status", k)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.status === k
                    ? "bg-amber-400 text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-amber-100"
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 별점 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">별점</label>
          <StarRating value={form.rating} onChange={(v) => set("rating", v)} size="text-2xl" />
        </div>

        {/* 메모 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">📝 책 속 메모</label>
            <button type="button" onClick={addMemo}
              className="text-sm text-amber-600 hover:text-amber-800 font-semibold">
              + 메모 추가
            </button>
          </div>
          {form.memos.length === 0
            ? <div className="text-center py-5 bg-amber-50 rounded-xl text-gray-400 text-sm border border-dashed border-amber-200">
                인상 깊은 구절을 메모해 보세요!<br />
                <button type="button" onClick={addMemo} className="mt-1.5 text-amber-500 underline text-xs">첫 메모 추가하기</button>
              </div>
            : <div className="space-y-2">
                {form.memos.map(m => (
                  <MemoItem key={m.id} memo={m}
                    onChange={(u) => updateMemo(m.id, u)}
                    onDelete={() => deleteMemo(m.id)} />
                ))}
              </div>
          }
        </div>

        {/* 느낀 점 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">💭 느낀 점</label>
          <textarea value={form.feelings} onChange={(e) => set("feelings", e.target.value)}
            placeholder="책을 읽고 느낀 점을 자유롭게 적어보세요..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none text-sm"
            rows={5} />
        </div>

        {/* 버튼 — 취소는 텍스트 링크, 주요 액션에 시선 집중 */}
        <div className="flex items-center gap-4 pb-6">
          <button type="button" onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2 px-1">
            취소
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-md text-sm">
            {saving ? "저장 중..." : isEdit ? "✏️ 수정 완료" : "📚 저장하기"}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── 책 상세 보기 ────────────────────────── */
const BookDetail = ({ book, isOwner, onEdit, onDelete }) => {
  const readingDays = book.startDate && book.endDate
    ? Math.ceil((new Date(book.endDate) - new Date(book.startDate)) / (1000*60*60*24)) + 1
    : null

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8 fade-in">
      <div className="flex gap-5 items-start">
        <div className="w-28 h-40 rounded-xl overflow-hidden shadow-md flex-shrink-0">
          {book.coverImage
            ? <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display="none"; e.target.nextSibling.style.display="flex" }}
              />
            : null}
          <div style={{ display: book.coverImage ? "none" : "flex" }} className="w-full h-full">
            <DefaultCover title={book.title} />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[book.status]}`}>
            {STATUS_LABELS[book.status]}
          </span>
          <h2 className="text-xl font-bold text-gray-800 leading-snug">{book.title}</h2>
          {book.author && <p className="text-gray-500 text-sm">{book.author}</p>}
          <StarRating value={book.rating} readonly size="text-xl" />
          {book.startDate && (
            <p className="text-gray-400 text-xs">
              📅 {book.startDate}{book.endDate ? ` ~ ${book.endDate}` : " ~"}
              {readingDays && <span className="ml-1 text-amber-500">({readingDays}일)</span>}
            </p>
          )}
          {book.memos?.length > 0 && (
            <p className="text-amber-500 text-xs">📝 메모 {book.memos.length}개</p>
          )}
        </div>
      </div>

      {book.memos?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-gray-700 text-sm">📝 책 속 메모 <span className="text-amber-500">({book.memos.length})</span></h3>
          {book.memos.map(m => (
            <div key={m.id} className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-400">
              {m.page && (
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mr-2">
                  p.{m.page}
                </span>
              )}
              <p className="text-gray-700 text-sm leading-relaxed mt-1.5 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>
      )}

      {book.feelings && (
        <div className="space-y-2">
          <h3 className="font-bold text-gray-700 text-sm">💭 느낀 점</h3>
          <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-300">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{book.feelings}</p>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="flex gap-3">
          <button onClick={onEdit}
            className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors shadow-md text-sm">
            ✏️ 수정하기
          </button>
          <button onClick={onDelete}
            className="py-3 px-5 border border-red-300 text-red-400 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium">
            🗑️ 삭제
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 메인 App ────────────────────────────── */
const App = () => {
  const [user, setUser]                 = useState(null)
  const [authLoading, setAuthLoading]   = useState(true)
  const [books, setBooks]               = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [view, setView]                 = useState("list")
  const [selectedBook, setSelectedBook] = useState(null)
  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  /* 책 목록 로드 */
  useEffect(() => {
    loadBooks().then(loaded => {
      setBooks(loaded)
      setBooksLoading(false)
    })
  }, [])

  /* 인증 상태 감지 */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider) }
    catch (e) { if (e.code !== 'auth/popup-closed-by-user') alert('로그인 실패: ' + e.message) }
  }

  const handleLogout = async () => {
    await signOut(auth)
    goList()
  }

  const goList   = () => { setView("list"); setSelectedBook(null) }
  const goDetail = (b) => { setSelectedBook(b); setView("detail") }

  const handleSave = async (book) => {
    await saveBook(book)
    if (view === "edit") {
      setBooks(prev => prev.map(b => b.id === book.id ? book : b))
      setSelectedBook(book)
      setView("detail")
    } else {
      setBooks(prev => [book, ...prev])
      goList()
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${selectedBook.title}"을(를) 삭제할까요?`)) return
    await removeBook(selectedBook.id)
    setBooks(prev => prev.filter(b => b.id !== selectedBook.id))
    goList()
  }

  const isOwner = user?.uid === 'tuIXqYWofGa39ujsoPvcVrviXUC2'

  if (booksLoading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-5xl animate-bounce">📚</div>
    </div>
  )

  const filtered = books.filter(b => {
    const q = search.toLowerCase()
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
    const matchS = filterStatus === "all" || b.status === filterStatus
    return matchQ && matchS
  })

  const stats = {
    total:     books.length,
    completed: books.filter(b => b.status === "completed").length,
    reading:   books.filter(b => b.status === "reading").length,
  }

  const headerTitle = {
    list:   "📚 나의 독서록",
    add:    "📖 책 추가",
    edit:   "✏️ 책 수정",
    detail: selectedBook?.title ?? "책 상세",
  }[view]

  const backTarget = { detail:"list", add:"list", edit:"detail" }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {view !== "list" && (
              <button
                onClick={() => {
                  const t = backTarget[view]
                  if (t === "list") goList()
                  else setView("detail")
                }}
                className="text-gray-400 hover:text-gray-700 transition-colors mr-1 text-xl flex-shrink-0">
                ‹
              </button>
            )}
            <h1 className="text-lg font-bold text-amber-800 truncate">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!authLoading && (
              isOwner ? (
                <>
                  {view === "list" && (
                    <button onClick={() => setView("add")}
                      className="bg-amber-400 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm shadow-sm">
                      + 책 추가
                    </button>
                  )}
                  <button onClick={handleLogout}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
                    로그아웃
                  </button>
                </>
              ) : (
                <button onClick={handleLogin}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
                  🔑 관리자
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* 목록 */}
        {view === "list" && (
          <div className="fade-in space-y-5">
            {books.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"전체", value: stats.total, color:"text-amber-600" },
                  { label:"완독", value: stats.completed, color:"text-emerald-500" },
                  { label:"읽는 중", value: stats.reading, color:"text-sky-500" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-amber-100">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 검색창 — 통계 카드·필터 탭과 여백 리듬을 맞춤 */}
            <div className="relative mx-0.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text" placeholder="제목 또는 저자로 검색..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[["all","전체"], ["want","읽고 싶음"], ["reading","읽는 중"], ["completed","완독"]].map(([k, v]) => (
                <button key={k} onClick={() => setFilterStatus(k)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filterStatus === k
                      ? "bg-amber-400 text-white shadow-sm"
                      : "bg-white text-gray-500 hover:bg-amber-50 border border-gray-200"
                  }`}>
                  {v} {k !== "all" && <span className="ml-0.5 opacity-70">({books.filter(b=>b.status===k).length})</span>}
                </button>
              ))}
            </div>

            {filtered.length === 0
              ? <div className="text-center py-16 space-y-3">
                  <div className="text-5xl">📖</div>
                  <p className="text-gray-400 text-sm">
                    {books.length === 0 ? "아직 등록된 책이 없습니다." : "검색 결과가 없습니다."}
                  </p>
                </div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filtered.map(b => <BookCard key={b.id} book={b} onClick={goDetail} />)}
                </div>
            }
          </div>
        )}

        {view === "add" && isOwner && <BookForm onSave={handleSave} onCancel={goList} />}
        {view === "detail" && selectedBook && (
          <BookDetail
            book={selectedBook}
            isOwner={isOwner}
            onEdit={() => setView("edit")}
            onDelete={handleDelete}
          />
        )}
        {view === "edit" && selectedBook && isOwner && (
          <BookForm book={selectedBook} onSave={handleSave} onCancel={() => setView("detail")} />
        )}
      </main>
    </div>
  )
}

export default App
