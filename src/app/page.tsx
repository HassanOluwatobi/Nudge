import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Shrink my day | A calm to-do list for ADHD brains",
  description: "Put it all down, pick one thing, and start with a tiny step. A free to-do list made for busy, scattered, ADHD brains. No sign up. Works on your phone and laptop.",
  alternates: { canonical: "/" },
};

// People who already use the app go straight to it: opened from the Home
// Screen, already have tasks, or came from a reminder or a device code.
// Add ?home to the address to see this page anyway.
const SKIP = `try{var q=location.search,h=location.hash;if(!/[?&]home\\b/.test(q)){var d={};try{d=JSON.parse(localStorage.getItem('nudgeme.v11')||'{}')||{}}catch(e){}var used=(d.tasks&&d.tasks.length>0)||(d.meta&&d.meta.intro);if(matchMedia('(display-mode: standalone)').matches||navigator.standalone||used||/^#link=/.test(h)||/[?&]from=/.test(q)||localStorage.getItem('nudgeme.link')){location.replace('/app'+q+h)}}}catch(e){}`;

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP }} />
      <Landing />
    </>
  );
}
