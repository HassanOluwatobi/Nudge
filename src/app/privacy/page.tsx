import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy · NudgeMe",
  description: "How NudgeMe handles your data. Short version: it stays on your phone.",
};

const UPDATED = "November 1, 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-serif text-[24px] leading-tight tracking-[-0.01em]">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{children}</p>;
}
function L({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-ink-2">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export default function Privacy() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Link href="/" className="text-[15px] font-medium text-signal-ink">
          ← Back to NudgeMe
        </Link>
        <h1 className="mt-6 font-serif text-[40px] leading-none tracking-[-0.02em]">Privacy policy</h1>
        <p className="mt-3 text-[14px] text-ink-3">Last updated {UPDATED}</p>

        <div className="mt-8 rounded-[20px] bg-white p-5 ring-1 ring-line">
          <p className="text-[17px] font-semibold">The short version</p>
          <P>
            NudgeMe has no accounts. Your tasks, ideas, notes and settings are saved on your own phone or computer. I don&apos;t have a server that stores them, and I can&apos;t see them. There are no ads, no tracking and nothing is sold.
          </P>
        </div>

        <H>Who runs NudgeMe</H>
        <P>NudgeMe is a small, free app made by Hassan, an independent designer. In this policy, &quot;I&quot; means me, and &quot;you&quot; means you, the person using NudgeMe.</P>

        <H>What stays on your device</H>
        <P>Everything you put into NudgeMe is saved in your browser&apos;s storage on your device. That includes tasks, subtasks, ideas, notes, reminder times, check-in times and your settings. It never leaves your device unless you choose one of the features below.</P>
        <P>Because it lives only on your device, clearing your browser data or deleting the app removes it. You can download a backup from Settings at any time, and load it back in later.</P>

        <H>Features that use other services</H>
        <P>Some features only work by talking to another service. Each one is off until you turn it on, and you can turn it off again in Settings.</P>

        <p className="mt-6 text-[17px] font-semibold">Reminders that ring when NudgeMe is closed</p>
        <P>When you turn on Notifications, your device gives NudgeMe a push address. This is how your phone&apos;s maker (Apple, Google, Microsoft or Mozilla) delivers notifications to it. NudgeMe sends that push address, and the next two weeks of reminders, to the NudgeMe reminder sender, which runs on Cloudflare.</P>
        <P>Your device seals each reminder before it is sent, using standard Web Push encryption. The reminder sender stores only the push address, the time to send each reminder and the sealed message. It cannot read what the reminder says. Each reminder is deleted once it is sent, and anything left over is deleted after a day. Turning Notifications off deletes your push address and all of your reminders from the sender.</P>

        <p className="mt-6 text-[17px] font-semibold">Google Calendar</p>
        <P>If you connect Google Calendar, NudgeMe asks Google for read-only access to your calendar events (the calendar.events.readonly permission). It uses that access for one thing. It reads your events for the next two weeks, so they can show up in NudgeMe as tasks with reminders.</P>
        <L
          items={[
            "The events go straight from Google to your device. They are not sent to me or to any server of mine.",
            "The access token Google gives NudgeMe is saved on your device and runs out after about an hour.",
            "NudgeMe never creates, changes or deletes anything in your Google account.",
            "If you choose to paste your calendar's private address instead, it is saved on your device. It passes through a NudgeMe relay that fetches the calendar and stores nothing.",
          ]}
        />
        <P>
          NudgeMe&apos;s use and transfer of information received from Google APIs follows the{" "}
          <a className="font-medium text-signal-ink underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Your Google data is never used for ads, never sold, never shared with anyone else, never read by a person and never used to train AI.
        </P>
        <P>
          You can remove NudgeMe&apos;s access at any time in Settings, or from your{" "}
          <a className="font-medium text-signal-ink underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            Google account permissions
          </a>
          .
        </P>

        <p className="mt-6 text-[17px] font-semibold">Apple Calendar, Notion, Calendly and Outlook</p>
        <P>If you connect one of these, the link or token you paste is saved on your device. Some of these services don&apos;t let browsers call them directly, so the request passes through a small NudgeMe relay. The relay forwards the request, sends the answer back to your device and keeps nothing. Only items dated in the next two weeks are read, and NudgeMe never changes anything in these services.</P>

        <p className="mt-6 text-[17px] font-semibold">Break it down with your AI</p>
        <P>When you tap Break it down, NudgeMe opens the AI app you picked (ChatGPT, Claude, Gemini or Grok) with a question that includes the task&apos;s name. What happens there is covered by that company&apos;s own privacy policy. NudgeMe doesn&apos;t send anything to them by itself, and you choose what to paste back.</P>

        <p className="mt-6 text-[17px] font-semibold">Voice typing</p>
        <P>The microphone button uses your browser&apos;s built-in speech recognition. Some browsers send the audio to their own online service to turn it into text. NudgeMe never records or keeps your audio.</P>

        <H>Hosting</H>
        <P>The NudgeMe website is hosted on Vercel, and the reminder sender and relays run on Cloudflare. Like any website, these hosts may briefly keep standard technical logs, such as IP addresses, for security and to keep the service running. I don&apos;t use them to track you.</P>

        <H>Cookies and analytics</H>
        <P>NudgeMe uses no cookies for tracking and no analytics. The only things it saves on your device are your own data and settings.</P>

        <H>Children</H>
        <P>NudgeMe isn&apos;t aimed at children under 13, and it doesn&apos;t knowingly collect anything from them.</P>

        <H>Your choices</H>
        <L
          items={[
            "See, edit or delete anything you added, right in the app.",
            "Download a backup, or delete everything from Settings.",
            "Turn off Notifications or disconnect any calendar at any time.",
            "Remove Google's access from your Google account permissions.",
          ]}
        />

        <H>Changes to this policy</H>
        <P>If this policy changes, I&apos;ll update it here and change the date at the top. If a change affects how your data is handled, NudgeMe will tell you in the app first.</P>

        <H>Contact</H>
        <P>
          Questions about your privacy? Message me on X at{" "}
          <a className="font-medium text-signal-ink underline" href="https://x.com/Art_sassin" target="_blank" rel="noopener noreferrer">
            @Art_sassin
          </a>
          .
        </P>
      </div>
    </main>
  );
}
