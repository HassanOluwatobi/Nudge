import { expect, test } from "vitest";
import { splitLines } from "@/lib/tasks";
const cases: [string, string[]][] = [
  ["pay rent, email Sade, book the dentist", ["Pay rent", "Email Sade", "Book the dentist"]],
  ["I need to buy milk and pay rent. Also call mum and dad", ["Buy milk", "Pay rent", "Call mum and dad"]],
  ["pay rent email Sade book the dentist", ["Pay rent", "Email Sade", "Book the dentist"]],
  ["Buy eggs, milk, bread", ["Buy eggs, milk, bread"]],
  ["groceries, laundry, gym", ["Groceries", "Laundry", "Gym"]],
  ["read the book", ["Read the book"]],
  ["Reply to Tunde", ["Reply to Tunde"]],
  ["call mum and dad", ["Call mum and dad"]],
  ["I have to finish the deck then send it to Tunde and also clean my room", ["Finish the deck", "Send it to Tunde", "Clean my room"]],
  ["Buy airtime\n- Pay rent\n3. Email landlord\n\n•  Call mum ", ["Buy airtime", "Pay rent", "Email landlord", "Call mum"]],
  ["check email", ["Check email"]],
  ["go to the store and buy milk", ["Go to the store", "Buy milk"]],
  ["Meeting with Ada at 3pm", ["Meeting with Ada at 3pm"]],
];
for (const [i, o] of cases) test(i, () => expect(splitLines(i)).toEqual(o));
