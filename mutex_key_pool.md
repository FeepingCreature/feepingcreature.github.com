The "Mutex Key Pool" Data Structure
# The Problem

How do you efficiently lock access to one row in a large database table?

# What Doesn't Work

- Allocating a mutex per row doesn't scale
- I guess if it's a futex it works?
  - I think the kernel implementation of futexes is roughly equivalent to what I'm going to suggest anyways.

# Mutex Key Pool

A Mutex Key Pool is a data structure that supports two operations, locking a key and unlocking a key.

A MKP consists of a table of `(Key key, Mutex mutex, int pending)` and a global lock.

A table row is "free" if `pending == 0`.

### Lock a key

- Lock the global lock.
- Scan the table for an entry with the key and `pending > 0`. If found:
    - increment `pending`
    - Store the mutex.
- Else scan for a free entry. If found:
    - set the key to your locking key and `pending` to 1.
    - Store the mutex.
    - The search for a free entry can be done simultaneously with the first scan.
- Else:
    - Grow the table by a new row: `(key, new Mutex, 1)`.
    - Store the mutex.
- Unlock the global lock
- Lock the stored mutex.

### Unlock a key

- Lock the global lock
- Scan the table for an entry with the key and `pending > 0`.
    - This must be found, or you're freeing an unlocked key.
    - Decrement `pending`.
        - This may free the row. But it's okay because we grab
          the mutex before we release the global lock,
          so even if it gets reused, the reuse will only begin once we call unlock.
    - Store the mutex.
- Unlock the global lock
- Unlock the mutex.

### Properties

It is easy to see that the number of allocated mutexes scales with the number of
simultaneous locked, rather than total keys.

Furthermore, there is almost never a reallocation after warmup.

Also, it is straightforward to turn the table into a hashmap, gaining *O(1)* lock/unlock performance.
