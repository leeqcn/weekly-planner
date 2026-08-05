import { COLORS } from '../lib/colors'
import { tr } from '../lib/i18n'

/**
 * English help. Deliberately a separate file from HelpZh rather than a
 * sentence-by-sentence translation — see Help.jsx for why.
 */
export default function HelpEn({ onBack }) {
  return (
    <div className="help-view">
      <div className="day-head">
        <button className="ghost" onClick={onBack}>
          ‹ Back to week
        </button>
        <h1>Help</h1>
      </div>

      <section className="card">
        <h2>Start here</h2>
        <ol className="help-steps">
          <li>
            <b>Create a few templates.</b> In Settings, add the things that repeat every
            week: work (an event), pay rent (a to-do), exercise (a habit). You write a
            template once and it generates entries every week from then on.
          </li>
          <li>
            <b>Go back to the week view</b> — it fills itself in from your templates. If
            anything is missing (right after you add a template, say), a{' '}
            <b>“Fill in N from templates”</b> button appears at the top.
          </li>
          <li>
            <b>Tap a date</b> to open that day, where you schedule times, log habits and
            record what you actually did.
          </li>
        </ol>
        <p className="muted small">
          You can skip templates entirely: open a day and tap the <b>+</b> in a column
          header to add a one-off.
        </p>
      </section>

      <section className="card">
        <h2>Three modules, always in the same order</h2>
        <p className="muted small">Same order in the week view and the day view.</p>
        <table className="help-table">
          <tbody>
            <tr>
              <th>To do</th>
              <td>
                Things with no time attached. Give them a <b>duration range</b> and tap
                “Schedule” to drop them onto the timeline.
              </td>
            </tr>
            <tr>
              <th>Time schedule</th>
              <td>
                A full 24 hours, Plan on the left and Actually on the right. Sleep fits
                on it too.
              </td>
            </tr>
            <tr>
              <th>Habits</th>
              <td>
                Things that repeat daily and get a completion score. Two-minute things
                (blood pressure, vitamins) belong here, not on the timeline.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Gestures on the timeline</h2>
        <table className="help-table">
          <tbody>
            <tr>
              <th>Long-press empty space</th>
              <td>
                <b>Add an entry</b> at that time: pick something still unscheduled today,
                or write a new one. Works in either column; the <b>+</b> in the header
                does the same. You can type the start time — it defaults to{' '}
                <b>when the previous thing ended</b>, so your finger does not have to be
                accurate.
              </td>
            </tr>
            <tr>
              <th>Long-press a block</th>
              <td>
                Opens the editor. <b>Whichever column you pressed from, that set of times
                goes on top</b> — press on the right and you are editing what actually
                happened, with no risk of changing the plan.
              </td>
            </tr>
            <tr>
              <th>Drag the strip on the left edge</th>
              <td>Moves it (snaps to 5 minutes)</td>
            </tr>
            <tr>
              <th>Drag the bottom edge</th>
              <td>
                Resizes it. Setting the length by hand means you have settled it, so the
                block becomes solid.
              </td>
            </tr>
            <tr>
              <th>Single tap</th>
              <td>Selects. Select several and drag them together.</td>
            </tr>
            <tr>
              <th>Double-tap a block on the left</th>
              <td>Marks it done and copies the plan into the actual times</td>
            </tr>
            <tr>
              <th>Double-tap a block on the right</th>
              <td>Undoes that</td>
            </tr>
          </tbody>
        </table>
        <p className="muted small">
          On a phone only those two narrow strips are draggable; the rest of the block
          taps and scrolls normally — otherwise a finger landing on a block would stop
          you scrolling a 24-hour timeline.
        </p>
        <p className="muted small">
          <b>“Shift later blocks too”</b> at the top of the timeline is on by
          default: move a block and everything after it moves by the same amount, so one
          thing running late carries the rest along. It only applies to Plan — Actually is
          what already happened and should not be rewritten by a drag.
        </p>
      </section>

      <section className="card">
        <h2>Plan and Actually are different things</h2>
        <p>
          Plan on the left is <b>what you meant to do</b>; Actually on the right is{' '}
          <b>what you did</b>. Each column has its own faint tint (orange-ish on the left,
          green-ish on the right) and the editor uses the same two colours for the two
          sets of times.
        </p>
        <details>
          <summary>The quickest ways to record what actually happened</summary>
          <ul>
            <li>
              <b>Went to plan:</b> double-tap the block on the left and the actual times
              are copied from the plan.
            </li>
            <li>
              <b>No idea how long it will take:</b> tap <b>▶ Start</b> on the to-do row. A
              banner appears showing elapsed time and the block on the right grows to
              “now”. Tap <b>■ Stop</b> when you finish.
            </li>
            <li>
              <b>Filling it in afterwards:</b> long-press the block on the right. The
              cursor lands on <b>End</b> and a “now 19:42” bubble pops up — tap OK, tap
              Save, done in three taps. Save is pinned to the bottom of the dialog, so
              there is nothing to scroll for.
            </li>
            <li>
              <b>Never planned it at all:</b> long-press empty space in the right column
              and write it straight in.
            </li>
          </ul>
        </details>
        <details>
          <summary>What a block’s appearance means</summary>
          <table className="help-table">
            <tbody>
              <tr>
                <th>Solid</th>
                <td>Start and end are both settled (min = max) and nothing clashes</td>
              </tr>
              <tr>
                <th>Semi-transparent</th>
                <td>The duration is still a range (shopping 30–60 min), not settled</td>
              </tr>
              <tr>
                <th>Red</th>
                <td>It clashes with another block. Nothing is blocked — just drag it clear.</td>
              </tr>
              <tr>
                <th>Faded</th>
                <td>That planned entry is done or skipped</td>
              </tr>
            </tbody>
          </table>
        </details>
      </section>

      <section className="card">
        <h2>Typing times</h2>
        <ul>
          <li>
            Everything is typed — no clock dials. <b>9</b> / <b>930</b> / <b>0930</b> /{' '}
            <b>9:30</b> all work.
          </li>
          <li>
            <b>Fill in any two of start, end and duration; the third is worked out.</b>{' '}
            Duration can be <b>90</b> / <b>1:30</b> / <b>1.5h</b> / <b>45m</b>.
          </li>
          <li>Leave all three empty and it is a to-do with no time.</li>
          <li>
            Where the cursor starts depends on where you came from: editing the{' '}
            <b>plan</b> starts on “start”, editing the <b>actual</b> starts on “end”.
            Things you rarely change — duration range, category, colour — sit under{' '}
            <b>More</b>, which you only need to open once.
          </li>
          <li>
            While editing there is a miniature timeline of the day beside the fields, so
            you can see which slots are free and whether anything clashes.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Things with no fixed time</h2>
        <p>
          “Shopping, 30–60 minutes”, “dinner, an hour” — you know how long, not when. Give
          the to-do a <b>duration range</b>, then:
        </p>
        <ul>
          <li>
            Tap <b>“Schedule →”</b> (right after the duration) and it finds the first gap
            in the day that fits, using the upper bound. Schedule the next one and it
            lands right after — “shopping, dinner, shower after work” is three taps.
            On a phone <b>long names are truncated</b> so the Schedule and Start buttons
            stay on screen; <b>tap the name</b> to open the editor and see it in full.
          </li>
          <li>
            <b>If nothing fits it still goes in</b> (after the last block, even past
            midnight) and is marked red. Refusing would only send you off to type a time
            by hand.
          </li>
          <li>
            Tick <b>Keep</b> in the first column and the item stays in the to-do list even
            after it has been scheduled.
          </li>
        </ul>
        <details>
          <summary>How “free time left” is worked out</summary>
          <p>
            Free time runs from now to the end of the day, minus everything already
            occupied. Required time is the total of to-dos that are neither scheduled nor
            done. If it does not fit, the line turns red and says by how much.
          </p>
          <p className="muted small">
            What counts as occupied depends on status: <b>things you have done occupy
            their actual times</b> (if you planned reading at 21:00 but read at three in
            the afternoon, 21:00 is free again and can take something else), things in
            progress run to “now” or their planned end, skipped things occupy nothing, and{' '}
            <b>things not yet done occupy their planned slot</b> — there is no “actual” in
            the future. “Schedule it” reads from exactly the same ledger, so if it says
            there is room, there is room.
          </p>
        </details>
      </section>

      <section className="card">
        <h2>The week view</h2>
        <ul>
          <li>
            To do and Habits are n×8 grids: one row per thing, one column per day.{' '}
            <b>Tap a cell to cycle 100 / 50 / 0</b>.
          </li>
          <li>
            An unscored to-do counts as <b>0 and shows red</b>, so you can see at a glance
            which day has something still undone. An unlogged habit is <b>left blank</b> —
            all-red by default would be alarming for no reason.
          </li>
          <li>
            The grid <b>always fits all seven days</b>, with no sideways scrolling. The
            cost is that long names on the left get truncated (…): <b>tap a name to expand
            it</b>, tap again to collapse. Expanding makes only that row taller; the
            columns do not move. An emoji in front of the name (📖 🏃 💧) is easier to
            recognise than truncated text — worth naming them that way.
          </li>
          <li>
            In the middle are seven timelines, so you can see how full the week is.{' '}
            <b>Things you have done are drawn from the actual times (solid line, solid
            fill); things not yet done are drawn from the plan (dashed, pale)</b> — solid
            means it happened, pale means you intend to. One entry is drawn once, never
            twice.
          </li>
          <li>
            So past days are almost all solid; a dashed block in the past means{' '}
            <b>that one did not happen</b>. On today, solid to the left of the now-line and
            dashed to the right.
          </li>
          <li>
            <b>Tap a date</b> to open that day. On a narrow screen the blocks shrink to
            coloured bars that show the shape of the day; open the day view to read them.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Colours</h2>
        <p>
          One colour for sleep, another for work, and a glance tells you what the day
          looked like. Set it on a template in Settings, or override it on a single entry
          (the override wins).
        </p>
        <div className="help-swatches">
          {Object.entries(COLORS).map(([key, c]) => (
            <span key={key} className="help-swatch">
              <span style={{ background: c.block, borderColor: c.edge }} />
              {tr(c.label)}
            </span>
          ))}
        </div>
        <p className="muted small">
          A Morandi palette: low saturation, greyed off. The perceptual distance between
          every pair of the seven was measured, not eyeballed — an earlier set of eight
          had five pairs nobody could tell apart.
        </p>
      </section>

      <section className="card">
        <h2>Categories (what stats group by)</h2>
        <p>
          Stats aggregate by <b>category</b>, not by title — “metro to work” and “taxi
          home” are two titles and one category. Manage them in Settings. They can be
          disabled but not deleted: deleting one would leave that slice of history with
          nowhere to go.
        </p>
        <ul>
          <li>
            Set the category on a <b>template</b> and every entry it generates follows.
            You can still override a single entry; the entry’s own choice wins.
          </li>
          <li>
            Change a category and <b>the history changes with it</b> — you usually
            recategorise because you have realised it always belonged there.
          </li>
          <li>
            <b>Colour follows category</b>: give the category a colour and templates and
            entries inherit it unless they pick their own. “Sleep is grey” and “sleep is a
            category” do not have to be maintained twice.
          </li>
          <li>
            For one-offs, pick the category right there in the quick-add bubble. Type two
            characters of the title and <b>recent matches</b> appear; tapping one brings
            its duration and category along.
          </li>
        </ul>
        <details>
          <summary>Why it pays to categorise early</summary>
          <p>
            Detailed entries are kept for 28 days; after that only the per-day, per-
            category totals remain. <b>Once it is summarised, the category can no longer be
            changed.</b> The “Uncategorised” box in Settings groups leftovers by title so
            you can clear a pile at a time — a few minutes and it is empty.
          </p>
        </details>
      </section>

      <section className="card">
        <h2>Stats</h2>
        <p>
          “Stats” in the top bar. How many hours went into each category, how far that was
          from the plan, and whether it is drifting up or down.
        </p>
        <ul>
          <li>
            <b>The start date</b> defaults to next Monday and can be changed at the bottom
            of the page. Anything before it is left out — the first few days of using
            anything are always a mess.
          </li>
          <li>
            <b>Logged %</b> is the first number to look at. Hours you did not log went
            somewhere; if the percentage is low, discount everything below it. It is the
            grey band in the stacked chart.
          </li>
          <li>
            <b>Daily average = total ÷ days you did it</b>, not divided by calendar days.
            Min and max per day only count days you did it, too.
          </li>
          <li>
            <b>EWMA</b> answers “ignoring one freak week, where am I lately?”. The
            half-life can be 2 / 4 / 8 weeks — shorter tracks recent weeks more closely.
          </li>
          <li>
            <b>Export CSV</b> opens straight in Google Sheets: one row per day per
            category, ready for a pivot table.
          </li>
        </ul>
        <details>
          <summary>Two things to keep in mind when reading the charts</summary>
          <ul>
            <li>
              The trend chart’s <b>y-axis does not start at zero</b> — otherwise a line
              that barely changes would be pinned flat against the top. The range is
              printed under the chart, and the wobble looks bigger than it is.
            </li>
            <li>
              A week you never opened the app <b>does not count towards averages</b>. That
              is a week with no records, not a week where you did nothing.
            </li>
          </ul>
        </details>
      </section>

      <section className="card">
        <h2>Deleted means deleted</h2>
        <p>
          Every time you open the app, templates fill in whatever this week is still
          missing. So deleting leaves a <b>tombstone</b>: that template’s slot on that day
          is still taken, it is just not shown — which means{' '}
          <b>what you delete does not come back on the next refresh</b>.
        </p>
        <p className="muted small">
          Undo brings it back any time during the same session. Tombstones disappear with
          the 28-day cleanup. The same template still generates next week — you deleted
          that one day, not the template.
        </p>
      </section>

      <section className="card">
        <h2>Undo</h2>
        <p>
          The <b>back-arrow</b> button in the bottom-right corner undoes the last step, and
          it covers everything: dragging, scheduling, logging, colour changes, deletions.
          Hold it to see what would be undone. <b>Ctrl/⌘ + Z</b> works on a computer.
        </p>
        <p className="muted small">
          One drag that shifted several blocks counts as <b>one</b> step. The undo history
          is cleared when you reload the page. Deleting a template undoes cleanly too: the
          template, the habit logs that were deleted along with it, and the link between it
          and the entries it generated all go back.
        </p>
      </section>

      <section className="card">
        <h2>What lives in Settings</h2>
        <ul>
          <li>
            <b>Templates</b>: the things that repeat weekly. The type — event, to-do or
            habit — decides which module it shows up in. You can give it fixed times, a
            duration range and a colour.
          </li>
          <li>
            <b>Repeat rules</b>: pick days of the week, or a day of the month (rent).
          </li>
          <li>
            Renaming a template updates entries already generated for <b>today and later</b>;
            past ones are left alone. Colour is resolved live from the template, so
            changing it updates every view at once.
          </li>
          <li>
            <b>Language</b>: Chinese or English. It follows your browser by default.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Adding it to your phone</h2>
        <p>
          This is a PWA. On iPhone: open in Safari → Share → <b>Add to Home Screen</b>. On
          Android: open in Chrome → menu → <b>Install app</b>. It then opens like an
          ordinary app, with no browser address bar.
        </p>
        <p className="muted small">
          The interface itself opens offline, but reading and writing data needs a
          connection.
        </p>
      </section>

      <div className="modal-actions">
        <span className="spacer" />
        <button className="primary" onClick={onBack}>
          Got it
        </button>
      </div>
    </div>
  )
}
