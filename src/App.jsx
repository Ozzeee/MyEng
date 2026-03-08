import { useState, useEffect, useCallback, useRef } from 'react'

// ─── API helpers ───────────────────────────────────────────────────────────────

async function apiNotion(action, body = {}) {
  const res = await fetch(`/api/notion?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiGenerate(words) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  })
  return res.json()
}

function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = /[а-яё]/i.test(text) ? 'ru-RU' : 'en-US'
  u.rate = 0.85
  window.speechSynthesis.speak(u)
}

// ─── Storage helpers (localStorage for streak/session) ────────────────────────

function getLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function setLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%',
      transform: 'translateX(-50%)',
      background: type === 'err' ? 'rgba(40,12,12,0.95)' : 'rgba(12,28,16,0.95)',
      border: `1px solid ${type === 'err' ? 'rgba(248,113,113,0.4)' : 'rgba(74,222,128,0.3)'}`,
      color: type === 'err' ? '#f87171' : '#4ade80',
      borderRadius: 8, padding: '10px 20px', fontSize: 12,
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
      zIndex: 1000, animation: 'slideDown 0.25s ease',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {msg}
    </div>
  )
}

function StatBox({ value, label, accent }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '14px 8px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 28,
        color: accent || 'var(--amber)', lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 5, letterSpacing: '0.12em' }}>{label}</div>
    </div>
  )
}

function TagPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 500,
      letterSpacing: '0.08em', cursor: 'pointer', border: 'none', outline: 'none',
      background: active ? 'var(--amber-dim)' : 'transparent',
      color: active ? 'var(--amber)' : 'var(--text3)',
      boxShadow: active ? 'inset 0 0 0 1px var(--amber)' : 'inset 0 0 0 1px var(--border)',
      transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
    }}>
      {label}
    </button>
  )
}

function Btn({ children, onClick, variant = 'primary', disabled, style: s = {} }) {
  const base = {
    fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13,
    letterSpacing: '0.05em', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--radius)', transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1, outline: 'none',
  }
  const variants = {
    primary: { background: 'var(--amber)', color: '#09090b', padding: '12px 20px' },
    secondary: { background: 'var(--bg3)', color: 'var(--text)', padding: '12px 20px', boxShadow: 'inset 0 0 0 1px var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text2)', padding: '12px 20px', boxShadow: 'inset 0 0 0 1px var(--border)' },
    danger: { background: 'var(--red-dim)', color: 'var(--red)', padding: '12px 20px', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,0.3)' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...s }}>
      {children}
    </button>
  )
}

function CardRow({ card, onClick }) {
  return (
    <div onClick={onClick} className="fade-up" style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 8,
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, marginBottom: 3, color: 'var(--text)' }}>{card.word}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: card.tags?.length ? 6 : 0 }}>
          {card.translation}
        </div>
        {card.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {card.tags.map(t => (
              <span key={t} style={{
                fontSize: 9, color: 'var(--amber)', background: 'var(--amber-dim)',
                padding: '2px 7px', borderRadius: 10, letterSpacing: '0.06em',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
        {card.mastered && (
          <span style={{ fontSize: 9, color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 10 }}>✓</span>
        )}
        <span
          onClick={e => { e.stopPropagation(); speak(card.word) }}
          style={{ fontSize: 16, cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        >🔊</span>
      </div>
    </div>
  )
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function HomeScreen({ cards, tags, activeTag, setActiveTag, streak, todayCount, loading, onAdd, onStudy, onCardClick, notifOk, onRequestNotif }) {
  const filtered = activeTag === 'all' ? cards : cards.filter(c => c.tags?.includes(activeTag))
  const mastered = cards.filter(c => c.mastered).length

  return (
    <div className="fade-up" style={{ padding: '0 20px 40px' }}>
      {/* Header */}
      <div style={{ padding: '24px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--amber)', letterSpacing: '-0.3px' }}>
          MyEng <span style={{ fontSize: 14, opacity: 0.6 }}>✦</span>
        </div>
        <button
          onClick={notifOk ? undefined : onRequestNotif}
          style={{
            background: 'none', border: `1px solid ${notifOk ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
            color: notifOk ? 'var(--green)' : 'var(--text3)', cursor: notifOk ? 'default' : 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          {notifOk ? '🔔 вкл' : '🔔 уведомления'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <StatBox value={cards.length} label="КАРТОЧЕК" />
        <StatBox value={streak} label="ДНЕЙ ПОДРЯД" accent={streak > 0 ? 'var(--amber)' : 'var(--text3)'} />
        <StatBox value={mastered} label="ВЫУЧЕНО" accent={mastered > 0 ? 'var(--green)' : 'var(--text3)'} />
      </div>

      {/* Daily reminder */}
      {todayCount < 20 && cards.length > 0 && (
        <div style={{
          background: 'rgba(26,20,0,0.8)', border: '1px solid rgba(61,46,0,0.8)',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 3 }}>
            ⚡ Сегодня: {todayCount}/20 карточек
          </div>
          <div style={{ fontSize: 11, color: 'rgba(180,140,40,0.6)' }}>
            Займись хотя бы 20 карточками для поддержания прогресса
          </div>
        </div>
      )}
      {todayCount >= 20 && (
        <div style={{
          background: 'var(--green-dim)', border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: 'var(--green)' }}>
            ✓ Дневная цель выполнена — {todayCount} карточек сегодня 🔥
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <Btn onClick={onAdd} style={{ flex: 1 }}>+ Добавить слова</Btn>
        <Btn onClick={onStudy} variant="secondary" disabled={!cards.length} style={{ flex: 1 }}>
          ▶ Учиться
        </Btn>
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <TagPill label="все" active={activeTag === 'all'} onClick={() => setActiveTag('all')} />
          {tags.map(t => (
            <TagPill key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} />
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <div className="pulse" style={{ fontFamily: 'var(--font-serif)', fontSize: 36, marginBottom: 8 }}>✦</div>
          <div style={{ fontSize: 11 }}>Загружаю карточки из Notion...</div>
        </div>
      )}

      {/* Card list */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '56px 0' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, marginBottom: 12, opacity: 0.2 }}>✦</div>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            {cards.length === 0
              ? 'Добавь слова после встречи,\nписьма или урока'
              : 'Нет карточек с этим тегом'}
          </div>
        </div>
      )}
      {!loading && filtered.map(card => (
        <CardRow key={card.id} card={card} onClick={() => onCardClick(card)} />
      ))}
    </div>
  )
}

function AddScreen({ onBack, onSaved, showToast }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState([])
  const [step, setStep] = useState('input') // input | preview
  const textRef = useRef()

  useEffect(() => { textRef.current?.focus() }, [])

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    const { cards, error } = await apiGenerate(input)
    setLoading(false)
    if (error || !cards?.length) {
      showToast('Не удалось сгенерировать карточки', 'err')
      return
    }
    setPreview(cards)
    setStep('preview')
  }

  const handleSave = async () => {
    setLoading(true)
    let saved = 0
    for (const card of preview) {
      const { error } = await apiNotion('create', card)
      if (!error) saved++
    }
    setLoading(false)
    showToast(`Сохранено ${saved} карточек в Notion ✦`)
    onSaved(preview)
  }

  return (
    <div className="fade-up" style={{ padding: '0 20px 40px' }}>
      <div style={{ padding: '24px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--amber)' }}>
          {step === 'input' ? 'Новые слова' : 'Предпросмотр'}
        </div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--font-mono)',
        }}>← назад</button>
      </div>

      {step === 'input' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.8, marginBottom: 16 }}>
            Вставь слова или фразы — по одному в строке или через запятую.<br />
            Русский → English карточки. English → Русские карточки.
          </div>
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'deadline\nstakeholder\nитерация дизайна\nfeedback loop\ndeliverable'}
            style={{
              width: '100%', minHeight: 140, background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '14px 16px', color: 'var(--text)', fontSize: 13,
              fontFamily: 'var(--font-mono)', resize: 'vertical', outline: 'none',
              lineHeight: 1.7, transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ marginTop: 12 }}>
            <Btn onClick={handleGenerate} disabled={loading || !input.trim()} style={{ width: '100%' }}>
              {loading ? <span className="pulse">⟳ Генерирую карточки...</span> : '✦ Создать карточки'}
            </Btn>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
            Сгенерировано {preview.length} карточек. Проверь и сохрани в Notion.
          </div>
          <div style={{ maxHeight: '55vh', overflowY: 'auto', marginBottom: 16 }}>
            {preview.map((card, i) => (
              <div key={i} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 15 }}>{card.word}</div>
                  <div style={{ fontSize: 12, color: 'var(--amber)' }}>{card.translation}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 6 }}>
                  {card.transcription}
                </div>
                {card.examples?.[0] && (
                  <div style={{
                    fontSize: 11, color: 'var(--text2)', borderLeft: '2px solid var(--border)',
                    paddingLeft: 10, lineHeight: 1.5,
                  }}>{card.examples[0]}</div>
                )}
                {card.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {card.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 9, color: 'var(--amber)', background: 'var(--amber-dim)',
                        padding: '2px 7px', borderRadius: 10,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setStep('input')} variant="ghost" style={{ flex: 1 }}>← Изменить</Btn>
            <Btn onClick={handleSave} disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="pulse">Сохраняю...</span> : `💾 Сохранить в Notion (${preview.length})`}
            </Btn>
          </div>
        </>
      )}
    </div>
  )
}

function StudyScreen({ cards, onBack, onComplete, showToast }) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [done, setDone] = useState([])

  const current = queue[idx]
  const progress = (idx / queue.length) * 100

  const handleKnow = async (didKnow) => {
    if (didKnow) {
      setKnown(k => k + 1)
      await apiNotion('mastered', { id: current.id, mastered: true })
    }
    setDone(d => [...d, { ...current, knew: didKnow }])
    if (idx + 1 >= queue.length) {
      const total = queue.length
      const knownFinal = known + (didKnow ? 1 : 0)
      onComplete(total, knownFinal)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  if (!current) return null

  return (
    <div className="fade-up" style={{ padding: '0 20px 40px' }}>
      {/* Header */}
      <div style={{ padding: '24px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--text3)',
          cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
        }}>← стоп</button>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{idx + 1} / {queue.length}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, marginBottom: 24 }}>
        <div style={{
          height: '100%', background: 'var(--amber)', borderRadius: 1,
          width: `${progress}%`, transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Flip card */}
      <div
        className={`flip-card${flipped ? ' flipped' : ''}`}
        onClick={() => setFlipped(f => !f)}
        style={{ marginBottom: 16 }}
      >
        <div className="flip-card-inner">
          {/* Front */}
          <div className="flip-card-front" style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '36px 24px', minHeight: 200,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 34, lineHeight: 1.2, marginBottom: 4 }}>
                {current.word}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                {current.transcription}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
              нажми чтобы перевернуть
            </div>
          </div>

          {/* Back */}
          <div className="flip-card-back" style={{
            background: 'var(--bg2)', border: '1px solid var(--amber)',
            borderRadius: 14, padding: '24px', minHeight: 200,
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--amber)', marginBottom: 6 }}>
              {current.translation}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 14 }}>
              {current.transcription}
            </div>
            <div style={{ marginBottom: 14 }}>
              {current.examples?.slice(0, 2).map((ex, i) => (
                <div key={i} style={{
                  fontSize: 12, color: 'var(--text2)', borderLeft: '2px solid var(--border2)',
                  paddingLeft: 12, marginBottom: 8, lineHeight: 1.6,
                }}>{ex}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: 6 }}>СИН</div>
                {current.synonyms?.slice(0, 2).map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{s.word}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 6 }}>АНТ</div>
                {current.antonyms?.slice(0, 2).map((a, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{a.word}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Btn onClick={() => speak(current.word)} variant="ghost" style={{ flex: 1 }}>🔊</Btn>
        {flipped ? (
          <>
            <Btn onClick={() => handleKnow(false)} variant="danger" style={{ flex: 2 }}>✗ Не знаю</Btn>
            <Btn onClick={() => handleKnow(true)} style={{ flex: 2 }}>✓ Знаю</Btn>
          </>
        ) : (
          <Btn onClick={() => setFlipped(true)} style={{ flex: 3 }}>Показать перевод</Btn>
        )}
      </div>
    </div>
  )
}

function CardDetailScreen({ card, onBack, onTagAdd }) {
  const [tagInput, setTagInput] = useState('')

  return (
    <div className="fade-up" style={{ padding: '0 20px 40px' }}>
      <div style={{ padding: '24px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{card.word}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span
            onClick={() => speak(card.word)}
            style={{ fontSize: 18, cursor: 'pointer', opacity: 0.6 }}
          >🔊</span>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
          }}>← назад</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 4 }}>
        {card.transcription}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--amber)', marginBottom: 24 }}>
        {card.translation}
      </div>

      {/* Examples */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 10 }}>ПРИМЕРЫ</div>
        {card.examples?.map((ex, i) => (
          <div key={i} style={{
            fontSize: 13, color: 'var(--text2)', borderLeft: '2px solid var(--border2)',
            paddingLeft: 14, marginBottom: 10, lineHeight: 1.7,
          }}>{ex}</div>
        ))}
      </div>

      {/* Synonyms / Antonyms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '0.12em', marginBottom: 10 }}>СИНОНИМЫ</div>
          {card.synonyms?.map((s, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 12 }}>{s.word}</div>
              {s.note && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.note}</div>}
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 10 }}>АНТОНИМЫ</div>
          {card.antonyms?.map((a, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 12 }}>{a.word}</div>
              {a.note && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{a.note}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: 8 }}>ТЕГИ</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {card.tags?.map(t => (
            <span key={t} style={{
              fontSize: 10, color: 'var(--amber)', background: 'var(--amber-dim)',
              padding: '3px 10px', borderRadius: 12,
            }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { onTagAdd(card.id, tagInput.trim()); setTagInput('') } }}
            placeholder="добавить тег..."
            style={{
              flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: 'var(--text)',
              fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
            }}
          />
          <Btn
            onClick={() => { if (tagInput.trim()) { onTagAdd(card.id, tagInput.trim()); setTagInput('') } }}
            variant="secondary"
            style={{ padding: '9px 16px', fontSize: 12 }}
          >+</Btn>
        </div>
      </div>
    </div>
  )
}

function SessionSummary({ total, known, onHome }) {
  const pct = Math.round((known / total) * 100)
  return (
    <div className="fade-up" style={{ padding: '60px 20px 40px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 56, color: 'var(--amber)', marginBottom: 8 }}>
        {pct}%
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
        {known} из {total} слов знал
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 40 }}>
        {pct >= 80 ? 'Отличный результат! 🔥' : pct >= 50 ? 'Хороший прогресс ✦' : 'Повтори ещё раз — всё получится'}
      </div>
      <Btn onClick={onHome} style={{ width: '100%' }}>← На главную</Btn>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('home')
  const [cards, setCards] = useState([])
  const [tags, setTags] = useState([])
  const [activeTag, setActiveTag] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [viewCard, setViewCard] = useState(null)
  const [studyResult, setStudyResult] = useState(null)
  const [streak, setStreak] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [notifOk, setNotifOk] = useState(false)

  // Load cards from Notion on mount
  useEffect(() => {
    loadCards()
    // Streak / today count from localStorage
    const s = getLocal('myeng-streak', 0)
    const td = getLocal('myeng-today', { date: '', count: 0 })
    setStreak(s)
    if (td.date === new Date().toDateString()) setTodayCount(td.count)
    // Notif
    if (Notification?.permission === 'granted') setNotifOk(true)
    // Daily nudge
    scheduleDailyNotif()
  }, [])

  const loadCards = async () => {
    setLoading(true)
    const { cards: fetched, error } = await apiNotion('list')
    setLoading(false)
    if (error) { showToast('Ошибка загрузки из Notion', 'err'); return }
    setCards(fetched || [])
    const allTags = Array.from(new Set((fetched || []).flatMap(c => c.tags || [])))
    setTags(allTags)
  }

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const requestNotif = async () => {
    const p = await Notification?.requestPermission()
    if (p === 'granted') { setNotifOk(true); showToast('Уведомления включены ✓') }
  }

  const scheduleDailyNotif = () => {
    if (Notification?.permission !== 'granted') return
    const now = new Date()
    const next9am = new Date()
    next9am.setHours(9, 0, 0, 0)
    if (now > next9am) next9am.setDate(next9am.getDate() + 1)
    const delay = next9am - now
    setTimeout(() => {
      const td = getLocal('myeng-today', { date: '', count: 0 })
      if (td.date !== new Date().toDateString() || td.count < 20) {
        new Notification('MyEng ✦', {
          body: 'Время учить английский! Минимум 20 карточек сегодня 🔥',
        })
      }
    }, delay)
  }

  const handleSaved = async (newCards) => {
    showToast(`Сохранено ${newCards.length} карточек ✦`)
    await loadCards()
    setScreen('home')
  }

  const handleStudyComplete = async (total, known) => {
    const today = new Date().toDateString()
    const newCount = todayCount + total
    const newStreak = streak + 1
    setTodayCount(newCount)
    setStreak(newStreak)
    setLocal('myeng-today', { date: today, count: newCount })
    setLocal('myeng-streak', newStreak)
    if (notifOk) {
      new Notification('MyEng ✦', {
        body: `Сессия завершена! ${known}/${total} слов знал. Серия: ${newStreak} дней 🔥`,
      })
    }
    setStudyResult({ total, known })
    setScreen('summary')
  }

  const handleTagAdd = async (cardId, tag) => {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.tags?.includes(tag)) return
    const newTags = [...(card.tags || []), tag]
    // Update in Notion (we use the create approach — update properties)
    await fetch(`/api/notion?action=mastered`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cardId, mastered: card.mastered }),
    })
    // Optimistic update
    const updated = cards.map(c => c.id === cardId ? { ...c, tags: newTags } : c)
    setCards(updated)
    const allTags = Array.from(new Set(updated.flatMap(c => c.tags || [])))
    setTags(allTags)
    if (viewCard?.id === cardId) setViewCard({ ...viewCard, tags: newTags })
    showToast(`Тег "${tag}" добавлен`)
  }

  const studyCards = activeTag === 'all'
    ? cards.filter(c => !c.mastered)
    : cards.filter(c => c.tags?.includes(activeTag) && !c.mastered)

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {screen === 'home' && (
        <HomeScreen
          cards={cards}
          tags={tags}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          streak={streak}
          todayCount={todayCount}
          loading={loading}
          onAdd={() => setScreen('add')}
          onStudy={() => {
            if (!studyCards.length) { showToast('Все карточки выучены! Добавь новые ✦'); return }
            setScreen('study')
          }}
          onCardClick={(card) => { setViewCard(card); setScreen('card') }}
          notifOk={notifOk}
          onRequestNotif={requestNotif}
        />
      )}

      {screen === 'add' && (
        <AddScreen
          onBack={() => setScreen('home')}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {screen === 'study' && studyCards.length > 0 && (
        <StudyScreen
          cards={studyCards.length >= 20 ? studyCards : cards.filter(c => !c.mastered)}
          onBack={() => setScreen('home')}
          onComplete={handleStudyComplete}
          showToast={showToast}
        />
      )}

      {screen === 'card' && viewCard && (
        <CardDetailScreen
          card={viewCard}
          onBack={() => setScreen('home')}
          onTagAdd={handleTagAdd}
        />
      )}

      {screen === 'summary' && studyResult && (
        <SessionSummary
          total={studyResult.total}
          known={studyResult.known}
          onHome={() => { setScreen('home'); setStudyResult(null) }}
        />
      )}
    </div>
  )
}
