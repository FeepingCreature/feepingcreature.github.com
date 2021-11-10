JSON-RPC is broken: Notification Flooding
# JSON-RPC is broken

In this document, I will lay out and attempt to name a fundamental problem with JSON-RPC 2.0 over a TCP connection.

# So we were using JSON-RPC

[JSON-RPC 2.0 over TPC with netstrings](https://www.simple-is-better.org/json-rpc/transport_sockets.html#netstrings),
to be exact, and for a while, everything was (more or less) good. But then we started working with EventStore more
and more, and we ran into a problem.

EventStore is a stream database. Since we're working in an oddball language (D), we're connecting via JSON-RPC to
an EventStore proxy. There are several operations we can take:

- read events from a stream
- append events to the end of a stream
- subscribe to be notified when events are added to a stream.

It's the last one that gave us grief. You see, when you're subscribing to a stream, you can specify the position
at which you start reading. So from a JSON-RPC perspective, what you'd see is:

- client -> server: Subscribe to "IncomingEvents" at the previous position.
- client <- server: OK.
- client <- server: Notification! A new event has been published.
- client <- server: Notification! A new event has been published.
- client -> server: Append to "OutgoingEvents": StateChangeCommitted.
- client <- server: OK.
- client <- server: Notification!

You get the idea.

And this works fine. However, say you're restarting the service after a while. And you've missed a lot of events,
which EventStore can and will shovel out at a prodigous rate.

So you will instead get the following exchange:

- client -> server: Subscribe to "IncomingEvents" at the previous position.
- client <- server: OK.
- client <- server: Notification! While you were gone, 19477 events have been published. Here is event 1.
- client <- server: Notification: Here is event 2.
- client <- server: Notification: Here is event 3.
- client -> server: Okay, let me deal with event 1. Append to "OutgoingEvents": StateChangeCommitted.
- client <- server: Notification: Here is event 4.
- A long time passes.
- client <- server: Notification: Here is event 19477.
- client <- server: OK.

At this point, the client has buffered 19476 events.

Why don't we simply refuse to accept further events, creating backpressure? Well, look at the previous exchange: if
we'd stopped accepting notifications at event 10, we would never have gotten the "OK" message, because it's queued
after 19476 preceding messages. So our process would have been stuck trying to respond to event 1, forever waiting
for an answer that never came.

And this is why one of our our services was using 11GB after startup.

# The problem

I'll call this problem "Notification Flooding." It requires three components

- A protocol with requests, responses and notifications
- Where responses and notifications are delivered in order
- And notifications cannot be refused.

JSON-RPC 2.0 over a TCP connection fulfills these conditions.

When these parts come together, a client may be forced by the server to buffer an arbitrary amount of data with no
way to defend itself.

# The solution

Here are some fixes I considered:

- We could change the server to not send more events until we have explicitly acknowledged the previous events.
  - This effectively reimplements TCP ACK on top of JSON-RPC on top of TCP.
- We could just make the server send a single notification saying that 19477 events are available, and have the client
  explicitly request them at its leisure.
  - But this forces an additional round trip per event, which is at least annoying.
  - Arguably this is closest in spirit to how JSON-RPC is supposed to work though.

But in the end, I just opened a separate JSON-RPC connection for the subscription. Freed from the need to multiplex
responses, I could then backpressure it without issue.
