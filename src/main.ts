import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

const DIGEST_URL = 'https://ping-backend.vercel.app/api/digest'

type DigestItem = {
  chat: string
  author: string
  title: string
  text: string
  date: number | null
}

type DigestResponse = {
  generatedAt: string
  count: number
  items: DigestItem[]
}

// Shown only when the backend cannot be reached (it is not deployed yet).
// Marked offline on screen so sample text is never mistaken for live data.
const SAMPLE_ITEMS: DigestItem[] = [
  {
    chat: 'ping feed',
    author: 'bot',
    title: 'BTC $97,240 +1.8% · ETH $3,412 +0.9%',
    text: 'Top prices from CoinGecko',
    date: null,
  },
  {
    chat: 'ping test',
    author: 'therebelkins',
    title: 'Keep an eye on this. It is minting tomorrow.',
    text: 'Mint alert shared in the test group',
    date: null,
  },
  {
    chat: 'ping feed',
    author: 'bot',
    title: 'Polymarket: Jaguars vs Giants Yes 0%',
    text: 'Top event by 24h volume',
    date: null,
  },
]

const bridge = await waitForEvenAppBridge()

let items: DigestItem[] = []
let index = 0
let offline = false

function render(): string {
  if (items.length === 0) {
    return 'Ping\nLoading digests...\nTap: next · 2x tap: exit'
  }
  const item = items[index]
  const head = offline
    ? `Ping · ${items.length} new (offline)`
    : `Ping · ${items.length} new`
  return `${head}\n${index + 1}. ${item.title}\n${item.chat} · ${item.author}\nTap: next · 2x tap: exit`
}

async function loadDigest(): Promise<void> {
  try {
    const res = await fetch(DIGEST_URL, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as DigestResponse
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('empty digest')
    }
    items = data.items
    offline = false
  } catch {
    items = SAMPLE_ITEMS
    offline = true
  }
  index = 0
}

const mainText = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'main',
  content: render(),
  isEventCapture: 1,
})

const result = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [mainText],
  }),
)

console.log('Page created:', result === 0 ? 'success' : `failed (${result})`)

function upgrade(): void {
  bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: 'main',
      content: render(),
    }),
  )
}

await loadDigest()
upgrade()

// Reads the event type out of one envelope.
//
// CLICK_EVENT is 0, and protobuf omits zero-value fields on the wire, so a
// single tap arrives as an envelope whose `eventType` is `undefined`. The
// default has to be resolved INSIDE the envelope check. Writing
// `event.sysEvent?.eventType ?? OsEventTypeList.CLICK_EVENT` instead would
// read CLICK on events that carry no `sysEvent` at all, so every scroll,
// exit and audio frame would fire the tap handler.
function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

// Event routing, critical details:
//   • Taps/double-taps/lifecycle come through `event.sysEvent`.
//     Scroll gestures come through `event.textEvent`. Never mix them.
//   • Double-tap → `shutDownPageContainer(1)` is a root-level check: it
//     must fire no matter which envelope the event arrives in, so users
//     can always exit the app.
//   • Check DOUBLE_CLICK_EVENT before CLICK_EVENT.
const unsubscribe = bridge.onEvenHubEvent(event => {
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    bridge.shutDownPageContainer(1)
    return
  }

  if (sysType === OsEventTypeList.CLICK_EVENT || textType === OsEventTypeList.CLICK_EVENT) {
    // Tapping past the last item pulls a fresh digest, then starts again.
    if (index + 1 >= items.length) {
      void loadDigest().then(upgrade)
    } else {
      index += 1
      upgrade()
    }
    return
  }

  if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
    unsubscribe()
  }
})
