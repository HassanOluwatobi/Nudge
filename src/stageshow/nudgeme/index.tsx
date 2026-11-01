import { Notification, Phone, Stage, type Act } from '../kit'
import { Landscape } from './landscape'
import { Bird } from './bird'
import './nudgeme.css'

// NudgeMe's launch hero: one phone on its own painted world.
// Story in four beats. A morning reminder drops in (the cause). The thumb
// presses and holds "I did this step" and the gold fill runs across (the
// action). The card asks if the whole task is finished, and "All done"
// blooms the screen forest green (the payoff): a new stone lights on the
// path and Nudge the hummingbird flies on to the next one. The phone sleeps
// and wakes to the next morning, which is the loop's visible reset.
//
// Real strings: the reminder, Call mum, the first step, I did this step,
// Step done, All done, Done. Everything else is shape or art.

type Phase = 'home' | 'ask' | 'done'
type S = { banner: boolean; holding: boolean; phase: Phase; lit: number; asleep: boolean }

const START: S = { banner: false, holding: false, phase: 'home', lit: 3, asleep: false }
const REST = { x: 420, y: 470 }

const script = async (a: Act<S>) => {
  await a.wait(700)
  a.mark('reminder')
  a.set({ banner: true })
  await a.wait(2000)
  a.set({ banner: false })
  await a.wait(400)
  a.mark('hold')
  await a.move('hold')
  a.set({ holding: true })
  await a.drag('hold', undefined, { duration: 760 })
  a.set({ holding: false, phase: 'ask' })
  await a.wait(1300)
  a.mark('done')
  await a.click('alldone')
  a.set({ phase: 'done' })
  await a.wait(700)
  a.set({ lit: 4 })
  await a.wait(2600)
  // The phone sleeps, and wakes to a new morning.
  a.set({ asleep: true })
  await a.wait(650)
  await a.snap({ ...START, asleep: true })
  await a.move(REST)
  a.set({ asleep: false })
  await a.wait(500)
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AppIcon() {
  return (
    <span className="nm-icon">
      <Bird color="#fbf6ec" className="nm-icon__bird" />
    </span>
  )
}

export default function NudgeMeHero() {
  return (
    <Stage<S>
      width={620}
      height={560}
      compact={{ below: 620, width: 358, height: 560 }}
      initial={START}
      poster={{ ...START, phase: 'done', lit: 4 }}
      script={script}
      cursor={{ at: REST, style: 'touch' }}
      className="nm"
    >
      {(s, _rect, layout) => (
        <>
          <div className="nm-ground">
            <Landscape lit={s.lit} part="day" className="nm-ground__art" />
          </div>

          <Phone width={layout === 'compact' ? 326 : 340} frame="pro" className="nm-phone">
            <div className="nm-app" data-phase={s.phase}>
              <div className="nm-scene">
                <Landscape lit={s.lit} part="day" className="nm-scene__art" />
                <span className="nm-chip">
                  <Bird color="#17401f" className="nm-chip__bird" />
                  {Math.min(s.lit, 7)} of 7 stones lit
                </span>
              </div>

              <div className="nm-card">
                <span className="nm-label">
                  <i className="nm-dot" /> Your one thing
                </span>
                <span className="nm-title">Call mum</span>
                <div className="nm-swap" data-ask={s.phase !== 'home' || undefined}>
                  <div className="nm-step">
                    <span className="nm-step__meta">First step · about 2 min</span>
                    <span className="nm-step__text">Find the number and press call.</span>
                  </div>
                  <div className="nm-ask">
                    <span className="nm-ask__ok">
                      <Check /> Step done
                    </span>
                    <span className="nm-ask__q">Is the whole task finished?</span>
                  </div>
                </div>
              </div>

              <div className="nm-hold" data-target="hold" data-holding={s.holding || undefined} data-gone={s.phase !== 'home' || undefined}>
                <span className="nm-hold__label">
                  <Check /> I did this step
                </span>
                <span className="nm-hold__fill" aria-hidden>
                  <Check /> I did this step
                </span>
              </div>
              {/* The answer arrives where the thumb already is */}
              <div className="nm-answer" data-on={s.phase === 'ask' || undefined}>
                <span className="nm-btn nm-btn--quiet">Next step</span>
                <span className="nm-btn nm-btn--gold" data-target="alldone">
                  All done
                </span>
              </div>
              <span className="nm-hint" data-gone={s.phase !== 'home' || undefined}>
                Press and hold
              </span>

              {/* The finish: forest green rising from the thumb */}
              <div className="nm-done" data-on={s.phase === 'done' || undefined}>
                <div className="nm-done__scene">
                  <Landscape lit={s.lit} part="day" className="nm-scene__art" />
                </div>
                <span className="nm-done__word">
                  Done<i>.</i>
                </span>
                <span className="nm-done__task">Call mum</span>
                <span className="nm-done__note">A new stone is lit on your path.</span>
              </div>

              <div className="nm-banner" data-on={s.banner || undefined}>
                <Notification banner icon={<AppIcon />} title="NudgeMe" time="8:30" body="Good morning. Time to choose your one thing." />
              </div>

              <div className="nm-sleep" data-on={s.asleep || undefined} />
            </div>
          </Phone>
        </>
      )}
    </Stage>
  )
}
