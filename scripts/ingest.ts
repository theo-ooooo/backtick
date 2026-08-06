import { ingestAllFeeds } from "../src/lib/ingest";
ingestAllFeeds().then((r) => { console.table(r); process.exit(0); });
