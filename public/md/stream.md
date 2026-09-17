---
title: Wheelr for streamers — a spin wheel on your stream
path: /stream
canonical: https://www.wheelr.xyz/stream
updated: 2026-09-17
---

# Add a spin wheel to your stream

A giveaway is worth watching when the audience sees the draw happen. Wheelr runs
in a browser tab, hides its own interface on request, and can be captured by OBS
or Streamlabs like any other window — no plugin, no account for your viewers,
nothing to install.

## The setup, in four steps

1. **Build the wheel first.** Add your entries — viewer names, prizes,
   challenges — and set colours, centre logo and sounds while the interface is
   still visible. Everything is saved on your device, so the wheel is still there
   for the next stream.
2. **Hide the interface.** The eye button in the side rail hides the header, the
   footer and every control, leaving the wheel alone on screen.
3. **Capture the window in OBS.** Add a Window Capture source pointed at the
   browser window and crop to the wheel. It behaves like any other scene element.
4. **Spin on camera.** Click the wheel in your browser window and the spin plays
   out live, with an optional countdown before it and a winner effect after.

## Floating the wheel over your scene

To put the wheel on top of gameplay instead of on its own scene, give it a
background your software can key out: set the wheel background to a flat green
such as `#00FF00`, then add a Color Key filter to the capture source in OBS.

Pick a green that appears nowhere on the wheel itself — if a slice is the same
green, the filter punches a hole through it. A palette without green, or a
magenta key instead, avoids the problem.

## Letting chat see the entries

Sign in and save the wheel to the cloud and it gets a public link you can drop in
chat. Anyone who opens it sees the same entries in a read-only view, which is
what makes a draw believable: the list was public before the spin and is still
there afterwards.

Adding `?nobg=true` to that public link strips the background and the page
furniture, leaving just the wheel on a transparent page. It is a display, not a
control: the shared view turns slowly on its own and cannot be spun, so use it as
a panel or a second scene and keep the spinning in your own window.

## Keeping the draw credible

Every spin uses the browser's cryptographic random source, so nothing is seeded
or weighted; slices of the same size have the same chance. For a multi-prize
giveaway, turn on removing the winner after each spin so nobody wins twice, and
let the winners list build up on screen as the record of the session. Up to four
wheels can be shown side by side for parallel draws.

## FAQ

**Does it work with Streamlabs, Twitch and YouTube?**

Yes. Wheelr is a web page, so anything that can capture a browser window can put
it on stream — OBS Studio, Streamlabs Desktop, XSplit. The platform you broadcast
to makes no difference.

**Do my viewers need an account?**

No. A shared wheel opens in any browser with no signup. An account is only needed
on your side, to publish the link and to reach your wheels from another device.

**Can I match the wheel to my channel branding?**

Colours, background, fonts, the centre logo and every sound are replaceable, so
the wheel can carry your channel's look instead of a stock one.

**How do I add hundreds of viewer names quickly?**

Paste the whole list in one go rather than typing entries one by one, then
shuffle before the first spin. On very long lists the labels get thin, so the
winner is zoomed in on when the wheel stops.

## Links

- Streaming guide: https://www.wheelr.xyz/stream
- Prize wheel template: https://www.wheelr.xyz/templates/prize-wheel
- Wheel app: https://www.wheelr.xyz/
- All templates: https://www.wheelr.xyz/templates
