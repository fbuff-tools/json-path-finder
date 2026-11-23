# JSON Path Finder

**Stop counting brackets.** Find the exact JSONPath of any key or value in a big API response, then paste it into your code, `jq`, Postman tests, Zapier, Make or n8n.

- **In the browser (clickable tree):** https://fbuff.com/tools/json-path-finder/
- **In the terminal:** `jsonpath-find.mjs` in this repo, one file, zero dependencies, Node 18+.

Your JSON is never uploaded. The web tool parses it in your browser; the script runs locally.

## The pain

You have a 3,000-line response and you need the customer's email of the second order. So you scroll, count array items from 0, lose your place, and end up with `data.orders[2].customer.email` when it was `[1]`. Then a key like `first name` or `sku-id` breaks dot notation and your code returns `undefined`.

JSON Path Finder does the counting for you:

```
$ node jsonpath-find.mjs response.json bob
$.data.orders[1].customer["first name"]  =  "Bob"
  js: data.data.orders[1].customer["first name"]    jq: .data.orders[1].customer["first name"]
$.data.orders[1].customer.email  =  "bob@example.com"
  js: data.data.orders[1].customer.email    jq: .data.orders[1].customer.email
```

Every match prints three ready-to-paste forms: **JSONPath** (RFC 9535), a **JavaScript accessor** and a **jq path**. Keys that are not plain identifiers are quoted automatically.

## Usage

```bash
# Every key or value that contains the text (case-insensitive)
node jsonpath-find.mjs response.json "sku"

# Pipe straight from an API
curl -s https://api.example.com/orders | node jsonpath-find.mjs - "4242"

# Read the value at a path (check before you ship it)
node jsonpath-find.mjs response.json --get '$.data.orders[0].items[0]["sku-id"]'
```

Exit codes: `0` found, `1` nothing matched, `2` invalid JSON or path.

Try it on the sample: `node jsonpath-find.mjs example.json bob`. Run the tests with `node --test`.

## What paths are supported

Exact paths: `.key`, `["any key"]`, `['any key']` and array indexes `[0]`. Wildcards (`[*]`), recursive descent (`..`), slices and filters (`[?(@.price < 10)]`) are not evaluated, on purpose: the goal is one exact, copyable path. Simple paths like these work the same in every JSONPath library ([RFC 9535](https://www.rfc-editor.org/rfc/rfc9535)).

## Web version

https://fbuff.com/tools/json-path-finder/ adds an interactive tree (click any node to copy its path), a formatter that points at invalid JSON, path search and a live evaluator. It also accepts several JSON objects pasted one after another, such as log lines.

More free developer tools that run in your browser: [JSON Formatter](https://fbuff.com/tools/json-formatter/), [JWT Decoder](https://fbuff.com/tools/jwt-decoder/), [Regex Tester](https://fbuff.com/tools/regex-tester/), [all tools](https://fbuff.com/tools/).

## License

MIT
