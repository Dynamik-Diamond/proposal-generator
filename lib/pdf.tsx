import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatMoney, lineTotal } from "@/lib/pricing";
import type { Proposal } from "@/lib/types";
import type { SignatureRow } from "@/lib/public";

const INK = "#1C1A17";
const MUTED = "#5E574D";
const RULE = "#DDD5C7";

const s = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", fontSize: 10.5, color: INK, lineHeight: 1.55, backgroundColor: "#FFFFFF" },
  meta: { fontSize: 9, color: MUTED },
  title: { fontFamily: "Times-Roman", fontSize: 30, lineHeight: 1.1, marginTop: 8, marginBottom: 18 },
  h2: { fontFamily: "Times-Roman", fontSize: 17, marginBottom: 8 },
  section: { borderTopWidth: 0.75, borderTopColor: RULE, paddingTop: 14, marginTop: 16 },
  p: { marginBottom: 6 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, color: MUTED },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 6 },
  cellName: { flex: 1, paddingRight: 8 },
  cellAmt: { width: 90, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, fontFamily: "Times-Roman", fontSize: 18 },
  bold: { fontFamily: "Helvetica-Bold" },
  label: { fontSize: 8.5, color: MUTED, marginTop: 8 },
  sigImg: { height: 56, width: 200, objectFit: "contain", marginTop: 4, marginBottom: 6 },
  sigTyped: { fontFamily: "Times-Italic", fontSize: 26, lineHeight: 1.3, marginTop: 4, marginBottom: 6 },
  footer: { position: "absolute", bottom: 28, left: 56, right: 56, fontSize: 8, color: MUTED, flexDirection: "row", justifyContent: "space-between" },
});

/** Render **bold** runs inside a line. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={i} style={s.bold}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{part.replace(/[*_`]/g, "")}</Text>
        ),
      )}
    </>
  );
}

const BULLET = /^\s*([-*]|\d+\.)\s+/;

/** Group lines into paragraphs and bullet lists (a list may follow a lead-in line with no blank line). */
function MarkdownBlocks({ md }: { md: string }) {
  const blocks: { kind: "p" | "list"; lines: string[] }[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ kind: "p", lines: [] });
      continue;
    }
    const kind = BULLET.test(line) ? "list" : "p";
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && last.lines.length) last.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }
  return (
    <>
      {blocks
        .filter((b) => b.lines.length)
        .map((block, i) =>
          block.kind === "list" ? (
            <View key={i} style={{ marginBottom: 6 }}>
              {block.lines.map((l, j) => (
                <View key={j} style={s.bulletRow}>
                  <Text style={s.bullet}>{/^\s*\d+\./.test(l) ? `${j + 1}.` : "–"}</Text>
                  <Text style={{ flex: 1 }}>
                    <Inline text={l.replace(BULLET, "")} />
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text key={i} style={s.p}>
              <Inline text={block.lines.join(" ")} />
            </Text>
          ),
        )}
    </>
  );
}

type Event = { type: string; created_at: string; ip: string | null; user_agent: string | null };

export async function renderSignedPdf(args: { proposal: Proposal; businessName: string; signature: SignatureRow; events: Event[] }) {
  const { proposal: p, signature: sig } = args;
  const when = (iso: string) => new Date(iso).toUTCString();
  const footer = (
    <View style={s.footer} fixed>
      <Text>{p.title}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  const doc = (
    <Document title={p.title} author={args.businessName || undefined}>
      <Page size="A4" style={s.page}>
        <Text style={s.meta}>
          {args.businessName ? `${args.businessName} · ` : ""}Proposal for {p.client_name}
          {p.client_company ? `, ${p.client_company}` : ""}
        </Text>
        <Text style={s.title}>{p.title}</Text>
        {p.content
          .filter((sec) => sec.body.trim() || sec.key === "investment_note")
          .map((sec) => (
            <View key={sec.key} style={s.section} wrap>
              <Text style={s.h2}>{sec.heading}</Text>
              <MarkdownBlocks md={sec.body} />
              {sec.key === "investment_note" && (
                <View style={{ marginTop: 6 }}>
                  {p.line_items.map((it, i) => (
                    <View key={i} style={s.row} wrap={false}>
                      <View style={s.cellName}>
                        <Text style={s.bold}>{it.name}</Text>
                        {it.description ? <Text style={s.meta}>{it.description}</Text> : null}
                      </View>
                      <Text style={s.cellAmt}>{formatMoney(lineTotal(it), p.currency)}</Text>
                    </View>
                  ))}
                  <View style={s.total}>
                    <Text>Total</Text>
                    <Text>{formatMoney(p.total_cents, p.currency)}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Accepted</Text>
          {sig.method === "drawn" && sig.image_data ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={sig.image_data} style={s.sigImg} />
          ) : (
            <Text style={s.sigTyped}>{sig.signer_name}</Text>
          )}
          <Text style={s.label}>SIGNED BY</Text>
          <Text>
            {sig.signer_name} ({sig.signer_email})
          </Text>
          <Text style={s.label}>DATE</Text>
          <Text>{when(sig.signed_at)}</Text>
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.title}>Audit trail</Text>
        <Text style={s.meta}>Proposal ID {p.id}</Text>
        <Text style={s.label}>CONTENT FINGERPRINT (SHA-256 OF THE SIGNED VERSION)</Text>
        <Text style={{ fontFamily: "Courier", fontSize: 9 }}>{sig.content_hash}</Text>
        <Text style={s.label}>SIGNATURE METHOD</Text>
        <Text>{sig.method === "drawn" ? "Drawn by hand on screen" : "Typed name"}</Text>
        <View style={{ marginTop: 18 }}>
          {args.events.map((e, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={{ width: 80 }}>
                <Text style={s.bold}>{e.type[0].toUpperCase() + e.type.slice(1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>{when(e.created_at)}</Text>
                {(e.ip || e.user_agent) && (
                  <Text style={s.meta}>
                    {e.ip ? `IP ${e.ip}` : ""}
                    {e.ip && e.user_agent ? " · " : ""}
                    {e.user_agent ?? ""}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
        {footer}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
