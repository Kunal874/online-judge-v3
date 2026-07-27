/**
 * The stuck ladder, per problem.
 *
 * Rungs escalate deliberately: reframe the question, name the recurrence or
 * structure, point at the specific trap, and only then give the approach
 * away. A ladder whose first rung is the answer is just a spoiler with
 * extra steps.
 *
 * Written against the traps the hidden test cases actually punish — the
 * all-negative array, the empty-subarray identity, the quadratic scan —
 * so a rung is worth opening rather than a restatement of the problem.
 */
export interface SeedHint {
  label: string;
  body: string;
}

export const hintsByProblem: Record<string, SeedHint[]> = {
  "maximum-subarray-sum": [
    {
      label: "reframe",
      body: "Don't ask which subarray is best overall. Ask, for each index: what's the best subarray that ends exactly here? Answer that at every position and the overall answer is the largest of them.",
    },
    {
      label: "the recurrence",
      body: "At each step you have exactly two options: extend the run that ended at the previous element, or start fresh at this one. Take whichever is larger.",
    },
    {
      label: "the trap you're in",
      body: "What is your answer's identity element? If you started it at zero, you are asserting that an empty subarray is a legal answer. The statement says non-empty. What happens when every number is negative?",
    },
    {
      label: "the full approach",
      body: "Kadane's algorithm. Seed both the running total and the best-so-far from the first element, not from zero. Then for i from 1: cur = max(a[i], cur + a[i]); best = max(best, cur).",
    },
  ],

  "balanced-brackets": [
    {
      label: "reframe",
      body: "You only ever need to know one thing at a time: which bracket is still waiting to be closed most recently. That is a stack, and nothing else about the string matters.",
    },
    {
      label: "the trap you're in",
      body: "Two failures look the same but aren't: closing the wrong kind of bracket, and running out of string with brackets still open. Check both — one mid-loop, one at the end.",
    },
    {
      label: "the full approach",
      body: "Push every opening bracket. On a closing bracket, pop and compare kinds; a mismatch or an empty stack is an immediate NO. After the loop, the stack must be empty. Never rebuild the string — that turns a linear scan quadratic.",
    },
  ],

  "binary-search-insert-position": [
    {
      label: "reframe",
      body: "The array is already sorted and never changes. Anything you do per query that looks at every element is throwing that away.",
    },
    {
      label: "the invariant",
      body: "Keep a range that certainly contains the answer, and halve it each step. Be precise about which side is inclusive — most bugs here are a boundary that moves the wrong way and loops forever.",
    },
    {
      label: "the full approach",
      body: "Lower bound: lo = 0, hi = n. While lo < hi, take mid = (lo + hi) / 2; if a[mid] < x then lo = mid + 1 else hi = mid. Answer is lo. Duplicates fall out of this for free.",
    },
  ],

  "longest-increasing-run": [
    {
      label: "reframe",
      body: "A run is only ever extended or broken. You never need to look backwards — carry the length of the run ending at the current position.",
    },
    {
      label: "the trap you're in",
      body: "Strictly increasing. What should an array of equal elements return? Check what your initial value implies when nothing ever increases.",
    },
    {
      label: "the full approach",
      body: "Start both current and best at 1. For each i from 1: current = a[i] > a[i-1] ? current + 1 : 1, then best = max(best, current).",
    },
  ],

  "modular-exponentiation": [
    {
      label: "reframe",
      body: "Multiplying b times is impossible when b is 10^18. But squaring gets you from a^k to a^(2k) in one step — so you need the exponent's binary representation, not its magnitude.",
    },
    {
      label: "the trap you're in",
      body: "Two of them. Intermediate products overflow 64 bits unless you reduce after every multiply. And m can be 1, where every answer is 0 — including a^0, which is not 1 there.",
    },
    {
      label: "the full approach",
      body: "result = 1 % m (not 1 — that is what handles m = 1). While exp > 0: if exp is odd, result = result * base % m; base = base * base % m; exp /= 2. Use 128-bit or __int128 for the products if your language needs it.",
    },
  ],

  "count-distinct-elements": [
    {
      label: "reframe",
      body: "You are not being asked which values repeat, or how often — only how many different ones exist. That is a membership question, and membership is what a hash set answers in constant time.",
    },
    {
      label: "the full approach",
      body: "Insert every value into a hash set and print its size. Sorting first also works and is barely slower; comparing every pair does not, at this input size.",
    },
  ],

  "palindrome-check": [
    {
      label: "reframe",
      body: "Comparing the string to its reverse is correct but allocates a second copy. Two indices walking inwards from both ends decide it without allocating anything.",
    },
    {
      label: "the trap you're in",
      body: "Case is ignored. And if you are slicing the ends off the string each step, you are copying the whole thing every iteration — that is quadratic, and the largest case is 200,000 characters.",
    },
    {
      label: "the full approach",
      body: "Lowercase once. Then i = 0, j = len - 1; while i < j, compare s[i] and s[j], return NO on any mismatch, otherwise i++ and j--. Constant extra memory, one pass.",
    },
  ],

  fizzbuzz: [
    {
      label: "the trap you're in",
      body: "Check divisibility by 15 before checking 3 or 5. Otherwise a multiple of both prints Fizz and never reaches the FizzBuzz case.",
    },
    {
      label: "the full approach",
      body: "Loop i from 1 to n. If i % 15 == 0 print FizzBuzz; else if i % 3 == 0 print Fizz; else if i % 5 == 0 print Buzz; else print i. Build the output in one buffer rather than printing 10,000 times.",
    },
  ],

  "sum-of-two-numbers": [
    {
      label: "the trap you're in",
      body: "Both inputs reach 10^9, so their sum reaches 2×10^9 — past the top of a signed 32-bit int. Use a 64-bit type.",
    },
  ],
};
