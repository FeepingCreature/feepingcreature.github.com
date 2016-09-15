Recursion: An Intuitive Explanation for Confused Beginners
## What's wrong with recursion?

The standard "computer science" treatment of recursive functions focuses on treating functions as their mathematical
equivalent. It is my impression that some students have problems understanding how recursion works.

I believe that this problem sometimes stems from a misunderstanding of how functions actually work in practice.
I hope that in addressing that misunderstanding, the behavior of recursion will also become clear.

Imperative programming is usually taught with [trace tables](https://en.wikipedia.org/wiki/Trace_table), such as:

    0: int x = 1;
    1: for (int i = 0; i < 3; i++) {
    2:   x = x * 2;
    3: }

| line | x   | i   |
| ---- | --- | --- |
| 0    | 1   | -   |
| 1    | 1   | 0   |
| 2    | 2   | 0   |
| 1    | 2   | 1   |
| 2    | 4   | 1   |
| 1    | 4   | 2   |
| 2    | 8   | 2   |
| 1    | 8   | 3   |
| 3    | 8   | 3   |

However, this carries a grave risk.

Teaching variables in this way makes it seem like there is a single "blank form" with one field for every
variable, into which values are written and rewritten.

This is **false**. It works for simple programs, but it **completely** fails to explain recursion - more than that, it is actively
harmful to its understanding.

## the actual truth

If we are to keep the analogy of a "blank form," the _correct_ way to consider a function is as a "master template".

A better analogy: instead of a bunch of forms loosely laid on a table, what we are actually working with is a **stack**
of forms, of which only the top is visible. Whenever we call a function, we take that function's form, which is described by the code,
and run a _copy_ of it, which we place on top of the stack, filling in its parameter fields with the values given to the function.
When we return from the function, we simply remove the top sheet and write in its final return value for the call.

## an example

Take the Fibonacci function, the archetypal example of recursion.

    0: function fib(n)
    1:   if n = 1
    2:   then return 1
    3:   else if n = 2
    4:   then return 1
    5:   else return fib(n - 1) + fib(n - 2)
    
    6: print fib(5)

If we attempt to look at this function the way we have previously considered simple code, with a trace table, we get hopelessly confused:

| line | n   |
| ---  | --- |
| 6    | - |
| 0    | 5 |
| 1    | 5 |
| 3    | 5 |
| 5    | 5 |
| 0    | 4 wait what? |

What is actually happening here?

"fib" is not a form with a field "n": it is a "master form", of which we run a copy every time we encounter a call.

If we look at our stack of forms, this is what actually occurs:

| line | stack |
| --- | --- |
| 6    | - |
| 0    | [n = 5] |
| 1    | [n = 5] |
| 3    | [n = 5] |
| 5    | [n = 5] |
| 0    | \[n = 5] \[n = 4] |

Do you see? There is not just one variable `n`; there are actually _many_ - one for each time we call the function.

We can imagine that any time we return a value from fib, we take the field on the current top form labelled "return value", cut it out,
and paste it over that call in the form _beneath_ it.

    # template:
    function fib(n)
      ...
    
    # we do a call
    print fib(5)
    # which means we take a copy of the form for fib,
    # and pencil in its value of n with 5
    
    function fib(5)
      if 5 = 1 ...
      else if 5 = 2 ...
      else return fib(5 - 1) + fib(5 - 2)
    
    # we hit a further call to fib(4), which means
    # we take a copy of the *original* form for fib
    # and pencil in its value of n with 4
    
    # NEW FORM
    function fib(4)
      if 4 = 1 ...
      else if 4 = 2 ...
      else return fib(4 - 1) + fib(4 - 2)
    
    # NEW FORM
    function fib(3)
      if 3 = 1 ...
      else if 3 = 2 ...
      else return fib(3 - 1) + fib(3 - 2)
    
    # NEW FORM
    function fib(2)
      if 2 = 1 ...
      else if 2 = 2  return 1

At this point, our stack of forms looks like this, from top to bottom:

* fib(2) - current top form
* fib(3)
* fib(4)
* fib(5) - our initial form

So we actually have four versions of the variable `n` hanging around.

Note: In programming, this is known as the "call stack", and each form sheet is called a "stack frame".

Now, we've hit a "return" statement in `fib(2)`. What does this mean?

First, we remove the `fib(2)` sheet from the stack, bringing `fib(3)` back to the top.

Then we simply pencil in the return value for fib(2), 1, _on that sheet_.

    function fib(3)
      ...
      else return  1  + fib(3 - 2)

and proceed to the next part of the code.

    # NEW FORM
    function fib(1)
      if (1 = 1)  return 1

Our stack now looks like: `fib(5)`, `fib(4)`, `fib(3)`, `fib(1)`

Take the sheet off, revealing `fib(3)` again:

    function fib(3)
      ...
      else return  1  +  1

And so we remove `fib(3)` from the stack, revealing `fib(4)` and filling in its call to `fib(4 - 1)` with 2. And so on,
until the very last sheet is removed, and the program runs to completion and halts.

# What have we learnt?

To sum it up: when you are looking at a variable in a function, this is not actually a place that holds a value;
rather, there is one version of this variable for every time the function is called, with the most recent version "on top".

# Why go through all this effort?

So that recursion works. That's pretty much the only reason.

In old programming languages, functions worked like one would initially think, with every variable only existing once and having
a single value at a time. In these days, keeping a call stack would have been a nontrivial expense - you can read up on
the historical development of recursion
[in this excellent blogpost](https://vanemden.wordpress.com/2014/06/18/how-recursion-got-into-programming-a-comedy-of-errors-3/).

As computers have gained more memory, this tradeoff has largely become irrelevant. Every modern language now keeps a call stack.

# a more advanced topic: call and return in detail

How does all this "calling" and "returning" actually work at the hardware level?

It is not very incorrect to say that as the computer executes the program, it runs a finger along the code, executing it as it goes.
When it hits a call to a function, it has to move its finger (the "instruction pointer") over to the top of that function (and make a
new form ("stackframe"), and fill in its parameters).

This works fine, until you have to hit a "return" statement, at which point we discard the form and go back to where we came from.

But how does the computer actually know where to return to?

_Simply using the call stack_.

Every time the processor prepares a new form, it puts a field at the very top, labelled 'where I came from'. When we hit a return
statement, and the computer removes the top sheet, it just has to look at this field to remind itself where to go back to.

A historical note: in the very early days, before the invention of the stack, we used to write code in terms of direct jumps - literally
telling the computer "continue the execution over there". Everyone knows the classic example:

    10  PRINT "HELLO, WORLD"
    20  GOTO 10

This may seem simple, but it has a crippling flaw: you have to keep track of where to keep going in _every_ part of the code.

The invention of the call stack is what allowed us to write code that could work the same way no matter where we called it from.
It allows us to break up our problems into smaller sub-tasks, that can be reused in all sorts of different places.
It is the core idea that gave rise to modern programming, and I hope this article helps you understand it better.