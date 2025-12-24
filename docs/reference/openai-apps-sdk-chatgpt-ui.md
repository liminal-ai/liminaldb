# Build your ChatGPT UI - OpenAI Apps SDK

> Source: https://developers.openai.com/apps-sdk/build/chatgpt-ui

## Overview

UI components turn structured tool results from your MCP server into a human-friendly UI. Your components run inside an iframe in ChatGPT, talk to the host via the `window.openai` API, and render inline with the conversation. This guide describes how to structure your component project, bundle it, and wire it up to your MCP server.

You can also check out the [examples repository on GitHub](https://github.com/openai/openai-apps-sdk-examples).

### Component library

Use the optional UI kit at [apps-sdk-ui](https://openai.github.io/apps-sdk-ui) for ready-made buttons, cards, input controls, and layout primitives that match ChatGPT's container. It saves time when you want consistent styling without rebuilding base components.

## Understand the `window.openai` API

The host injects `window.openai` with UI-related globals and methods for calling tools, sending follow-ups, and managing layout. In your widget, read values directly from `window.openai` (e.g., `window.openai.toolOutput`, `window.openai.locale`) or through helper hooks like `useOpenAiGlobal` shown later.

`window.openai` is the bridge between your frontend and ChatGPT. Use the quick reference below to understand the available data and APIs before you dive into component scaffolding.

### List of capabilities

| Capability | What it does | Typical use |
| --- | --- | --- |
| **State & data** | `window.openai.toolInput` | Arguments supplied when the tool was invoked. |
| **State & data** | `window.openai.toolOutput` | Your `structuredContent`. Keep fields concise; the model reads them verbatim. |
| **State & data** | `window.openai.toolResponseMetadata` | The `_meta` payload; only the widget sees it, never the model. |
| **State & data** | `window.openai.widgetState` | Snapshot of UI state persisted between renders. |
| **State & data** | `window.openai.setWidgetState(state)` | Stores a new snapshot synchronously; call it after every meaningful UI interaction. |
| **Widget runtime APIs** | `window.openai.callTool(name, args)` | Invoke another MCP tool from the widget (mirrors model-initiated calls). |
| **Widget runtime APIs** | `window.openai.sendFollowUpMessage({ prompt })` | Ask ChatGPT to post a message authored by the component. |
| **Widget runtime APIs** | `window.openai.uploadFile(file)` | Upload a user-selected file and receive a `fileId`. |
| **Widget runtime APIs** | `window.openai.getFileDownloadUrl({ fileId })` | Retrieve a temporary download URL for a file uploaded by the widget or provided via file params. |
| **Widget runtime APIs** | `window.openai.requestDisplayMode(...)` | Request PiP/fullscreen modes. |
| **Widget runtime APIs** | `window.openai.requestModal(...)` | Spawn a modal owned by ChatGPT. |
| **Widget runtime APIs** | `window.openai.notifyIntrinsicHeight(...)` | Report dynamic widget heights to avoid scroll clipping. |
| **Widget runtime APIs** | `window.openai.openExternal({ href })` | Open a vetted external link in the user's browser. |
| **Context** | `window.openai.theme`, `window.openai.displayMode`, `window.openai.maxHeight`, `window.openai.safeArea`, `window.openai.view`, `window.openai.userAgent`, `window.openai.locale` | Environment signals you can read—or subscribe to via `useOpenAiGlobal`—to adapt visuals and copy. |

### useOpenAiGlobal

Many Apps SDK projects wrap `window.openai` access in small hooks so views remain testable. This example hook listens for host `openai:set_globals` events and lets React components subscribe to a single global value:

```typescript
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }

        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai[key]
  );
}
```

`useOpenAiGlobal` is an important primitive to make your app reactive to changes in display mode, theme, and "props" via subsequent tool calls.

For example, read the tool input, output, and metadata:

```typescript
export function useToolInput() {
  return useOpenAiGlobal("toolInput");
}

export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}

export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}
```

### Persist component state, expose context to ChatGPT

Widget state can be used for persisting data across user sessions, and exposing data to ChatGPT. Anything you pass to `setWidgetState` will be shown to the model, and hydrated into `window.openai.widgetState`

Widget state is scoped to the specific widget instance that lives on a single conversation message. When your component calls `window.openai.setWidgetState(payload)`, the host stores that payload under that widget's `message_id/widgetId` pair and rehydrates it only for that widget. The state does not travel across the whole conversation or between different widgets.

Follow-up turns keep the same widget (and therefore the same state) only when the user submits through that widget's controls—inline follow-ups, PiP composer, or fullscreen composer. If the user types into the main chat composer, the request is treated as a new widget run with a fresh `widgetId` and empty `widgetState`.

Anything you pass to `setWidgetState` is sent to the model, so keep the payload focused and well under 4k [tokens](https://platform.openai.com/tokenizer) for performance.

### Trigger server actions

`window.openai.callTool` lets the component directly make MCP tool calls. Use this for direct manipulations (refresh data, fetch nearby restaurants). Design tools to be idempotent where possible and return updated structured content that the model can reason over in subsequent turns.

Please note that your tool needs to be marked as [able to be initiated by the component](https://developers.openai.com/apps-sdk/build/mcp-server###allow-component-initiated-tool-access).

```typescript
async function refreshPlaces(city: string) {
  await window.openai?.callTool("refresh_pizza_list", { city });
}
```

### Send conversational follow-ups

Use `window.openai.sendFollowUpMessage` to insert a message into the conversation as if the user asked it.

```typescript
await window.openai?.sendFollowUpMessage({
  prompt: "Draft a tasting itinerary for the pizzerias I favorited.",
});
```

### Upload files from the widget

Use `window.openai.uploadFile(file)` to upload a user-selected file and receive a `fileId`. This currently supports `image/png`, `image/jpeg`, and `image/webp`.

```tsx
function FileUploadInput() {
  return (
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={async (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file || !window.openai?.uploadFile) {
          return;
        }

        const { fileId } = await window.openai.uploadFile(file);
        console.log("Uploaded fileId:", fileId);
      }}
    />
  );
}
```

### Download files in the widget

Use `window.openai.getFileDownloadUrl({ fileId })` to retrieve a temporary URL for files that were uploaded by the widget or passed to your tool via file params.

```typescript
const { downloadUrl } = await window.openai.getFileDownloadUrl({ fileId });
imageElement.src = downloadUrl;
```

### Close the widget

You can close the widget two ways: from the UI by calling `window.openai.requestClose()`, or from the server by having your tool response set `metadata.openai/closeWidget: true`, which instructs the host to hide the widget when that response arrives:

```json
{
  "role": "tool",
  "tool_call_id": "abc123",
  "content": "...",
  "metadata": {
    "openai/closeWidget": true,
    "openai/widgetDomain": "https://chatgpt.com",
    "openai/widgetCSP": {
      "connect_domains": ["https://chatgpt.com"],
      "resource_domains": ["https://*.oaistatic.com"],
      "redirect_domains": ["https://checkout.example.com"],
      "frame_domains": ["https://*.example.com"]
    }
  }
}
```

Note: By default, widgets cannot render subframes. Setting `frame_domains` relaxes this and allows your widget to embed iframes from those origins. Apps that use `frame_domains` are subject to stricter review and are likely to be rejected for broad distribution unless iframe content is core to the use case.

If you want `window.openai.openExternal` to send users to an external flow (like checkout) and enable a return link to the same conversation, optionally add the destination origin to `redirect_domains`. ChatGPT will skip the safe-link modal and append a `redirectUrl` query parameter to the destination so you can route the user back into ChatGPT.

### Widget session ID

The host includes a per-widget identifier in tool response metadata as `openai/widgetSessionId`. Use it to correlate multiple tool calls or logs for the same widget instance while it remains mounted.

### Request alternate layouts

If the UI needs more space—like maps, tables, or embedded editors—ask the host to change the container. `window.openai.requestDisplayMode` negotiates inline, PiP, or fullscreen presentations.

```typescript
await window.openai?.requestDisplayMode({ mode: "fullscreen" });
// Note: on mobile, PiP may be coerced to fullscreen
```

### Use host-backed navigation

Skybridge (the sandbox runtime) mirrors the iframe's history into ChatGPT's UI. Use standard routing APIs—such as React Router—and the host will keep navigation controls in sync with your component.

Router setup (React Router's `BrowserRouter`):

```tsx
export default function PizzaListRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PizzaListApp />}>
          <Route path="place/:placeId" element={<PizzaListApp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Programmatic navigation:

```typescript
const navigate = useNavigate();

function openDetails(placeId: string) {
  navigate(`place/${placeId}`, { replace: false });
}

function closeDetails() {
  navigate("..", { replace: true });
}
```

## Scaffold the component project

Now that you understand the `window.openai` API, it's time to scaffold your component project.

As best practice, keep the component code separate from your server logic. A common layout is:

```
app/
  server/            # MCP server (Python or Node)
  web/               # Component bundle source
    package.json
    tsconfig.json
    src/component.tsx
    dist/component.js   # Build output
```

Create the project and install dependencies (Node 18+ recommended):

```bash
cd app/web
npm init -y
npm install react@^18 react-dom@^18
npm install -D typescript esbuild
```

If your component requires drag-and-drop, charts, or other libraries, add them now. Keep the dependency set lean to reduce bundle size.

## Author the React component

Your entry file should mount a component into a `root` element and read initial data from `window.openai.toolOutput` or persisted state.

We have provided some example apps under the [examples page](https://developers.openai.com/apps-sdk/build/examples#pizzaz-list-source), for example, for a "Pizza list" app, which is a list of pizza restaurants.

### Explore the Pizzaz component gallery

We provide a number of example components in the [Apps SDK examples](https://developers.openai.com/apps-sdk/build/examples). Treat them as blueprints when shaping your own UI:

- **Pizzaz List** – ranked card list with favorites and call-to-action buttons.
- **Pizzaz Carousel** – embla-powered horizontal scroller that demonstrates media-heavy layouts.
- **Pizzaz Map** – Mapbox integration with fullscreen inspector and host state sync.
- **Pizzaz Album** – stacked gallery view built for deep dives on a single place.
- **Pizzaz Video** – scripted player with overlays and fullscreen controls.

Each example shows how to bundle assets, wire host APIs, and structure state for real conversations. Copy the one closest to your use case and adapt the data layer for your tool responses.

### React helper hooks

Using `useOpenAiGlobal` in a `useWidgetState` hook to keep host-persisted widget state aligned with your local React state:

```typescript
export function useWidgetState<T extends WidgetState>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends WidgetState>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends WidgetState>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useWebplusGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }

    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;

        if (newState != null) {
          window.openai.setWidgetState(newState);
        }

        return newState;
      });
    },
    [window.openai.setWidgetState]
  );

  return [widgetState, setWidgetState] as const;
}
```

The hooks above make it easy to read the latest tool output, layout globals, or widget state directly from React components while still delegating persistence back to ChatGPT.

## Widget localization

The host passes `locale` in `window.openai` and mirrors it to `document.documentElement.lang`. It is up to your widget to use that locale to load translations and format dates/numbers. A simple pattern with `react-intl`:

```tsx
import { IntlProvider } from "react-intl";
import en from "./locales/en-US.json";
import es from "./locales/es-ES.json";

const messages: Record<string, Record<string, string>> = {
  "en-US": en,
  "es-ES": es,
};

export function App() {
  const locale = window.openai.locale ?? "en-US";
  return (
    <IntlProvider locale={locale} messages={messages[locale] ?? messages["en-US"]}>
      {/* Render UI with <FormattedMessage> or useIntl() */}
    </IntlProvider>
  );
}
```

## Bundle for the iframe

Once you are done writing your React component, you can build it into a single JavaScript module that the server can inline:

```json
// package.json
{
  "scripts": {
    "build": "esbuild src/component.tsx --bundle --format=esm --outfile=dist/component.js"
  }
}
```

Run `npm run build` to produce `dist/component.js`. If esbuild complains about missing dependencies, confirm you ran `npm install` in the `web/` directory and that your imports match installed package names (e.g., `@react-dnd/html5-backend` vs `react-dnd-html5-backend`).

## Embed the component in the server response

See the [Set up your server docs](https://developers.openai.com/apps-sdk/build/mcp-server#) for how to embed the component in your MCP server response.

Component UI templates are the recommended path for production.

During development you can rebuild the component bundle whenever your React code changes and hot-reload the server.
