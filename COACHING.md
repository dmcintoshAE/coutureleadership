# Live executive coaching

Requires Node.js 24 (as in the Docker image). Configure `OPENAI_API_KEY` and `OPENAI_MODEL` in the server environment, then run `npm.cmd start`. Choose a Responses API compatible text model available to your OpenAI project. Docker Compose forwards both variables from the host environment. Keep credentials out of client files and source control.

Complete any simulator scenario and select **Request AI coaching** in the debrief. Only this action sends the authored scenario, three choices, and current optional reflection to OpenAI. The app does not persist coaching requests or responses; Responses API storage is disabled with `store: false`. Provider data handling policies still apply. The original debrief remains usable without configuration or during outages.

The endpoint is `POST /api/coach` with JSON `{ "scenarioId": "growth", "choices": [1, 0, 2], "reflection": "" }`. It returns `{ "text": "..." }` or a safe `{ "error": "..." }`. It enforces input limits, a 30-second provider timeout, five requests per IP per minute, and four concurrent requests per server process. If exposed beyond the existing local binding, put authenticated access and shared rate limiting at the gateway; the application has no user authentication.

Run `npm.cmd test`. Provider tests use mocked responses and incur no API charges. A real provider call requires deployment credentials and has not been verified by the automated tests.

API reference: https://developers.openai.com/api/docs/guides/text
