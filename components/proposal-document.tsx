import Markdown from "react-markdown";
import { formatMoney, lineTotal } from "@/lib/pricing";
import { formatDate } from "@/lib/dates";
import type { LineItem, Section } from "@/lib/types";

export type DocumentData = {
  title: string;
  client_name: string;
  client_company: string | null;
  content: Section[];
  line_items: LineItem[];
  total_cents: number;
  currency: string;
  sent_at: string | null;
  created_at: string;
  expires_at: string | null;
  business_name: string;
  logo_url: string | null;
};

const prose =
  "max-w-[65ch] text-[1.0625rem] sm:text-lg leading-[1.7] text-ink [&_p]:mt-4 [&_p:first-child]:mt-0 [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-0 [&_li]:relative [&_li]:pl-6 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.85em] [&_li]:before:h-px [&_li]:before:w-3 [&_li]:before:bg-brand [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-4";

function SectionBlock({ index, heading, children }: { index: number; heading: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule py-12 sm:py-16 md:grid-cols-[8rem_1fr] md:gap-10">
      <p className="font-display text-sm text-ink-muted tabular-nums md:pt-2">{String(index).padStart(2, "0")}</p>
      <div>
        <h2 className="font-display text-[1.75rem] sm:text-[2.25rem] leading-[1.1] tracking-[-0.01em] font-normal">{heading}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export function ProposalDocument({ doc }: { doc: DocumentData }) {
  const date = doc.sent_at ?? doc.created_at;
  const sections = doc.content.filter((s) => s.body.trim().length > 0 || s.key === "investment_note");
  let n = 0;

  return (
    <article>
      <header className="pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="flex items-center justify-between gap-4 text-sm text-ink-muted">
          {doc.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.logo_url} alt={doc.business_name || "Logo"} className="h-8 w-auto max-w-40 object-contain" />
          ) : (
            <span className="font-display text-base text-ink">{doc.business_name}</span>
          )}
          <span>Proposal · {formatDate(date)}</span>
        </div>
        <p className="mt-20 text-ink-muted sm:mt-28">
          Prepared for {doc.client_name}
          {doc.client_company ? `, ${doc.client_company}` : ""}
        </p>
        <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2.75rem,7vw,5.5rem)] font-light leading-[1.02] tracking-[-0.025em]">
          {doc.title}
        </h1>
        <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-4 border-t border-rule pt-6 text-sm">
          <div>
            <dt className="text-ink-muted">Investment</dt>
            <dd className="mt-1 font-display text-xl tabular-nums">{formatMoney(doc.total_cents, doc.currency)}</dd>
          </div>
          {doc.business_name && (
            <div>
              <dt className="text-ink-muted">Prepared by</dt>
              <dd className="mt-1 text-base">{doc.business_name}</dd>
            </div>
          )}
          {doc.expires_at && (
            <div>
              <dt className="text-ink-muted">Valid until</dt>
              <dd className="mt-1 text-base">{formatDate(doc.expires_at)}</dd>
            </div>
          )}
        </dl>
      </header>

      {sections.map((s) => {
        n += 1;
        if (s.key === "investment_note") {
          return (
            <SectionBlock key={s.key} index={n} heading={s.heading}>
              {s.body.trim() && (
                <div className={prose}>
                  <Markdown>{s.body}</Markdown>
                </div>
              )}
              <InvestmentTable items={doc.line_items} total={doc.total_cents} currency={doc.currency} />
            </SectionBlock>
          );
        }
        return (
          <SectionBlock key={s.key} index={n} heading={s.heading}>
            <div className={prose}>
              <Markdown>{s.body}</Markdown>
            </div>
          </SectionBlock>
        );
      })}
    </article>
  );
}

function InvestmentTable({ items, total, currency }: { items: LineItem[]; total: number; currency: string }) {
  return (
    <div className="mt-10">
      <table className="w-full text-left">
        <caption className="sr-only">Pricing</caption>
        <thead>
          <tr className="border-b border-ink text-sm text-ink-muted">
            <th scope="col" className="pb-3 font-normal">Item</th>
            <th scope="col" className="hidden pb-3 text-right font-normal sm:table-cell">Qty</th>
            <th scope="col" className="pb-3 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-rule align-top">
              <td className="py-4 pr-4">
                <p className="font-medium">{item.name}</p>
                {item.description && <p className="mt-1 text-sm text-ink-muted max-w-[52ch]">{item.description}</p>}
              </td>
              <td className="hidden py-4 text-right tabular-nums text-ink-muted sm:table-cell">{item.qty}</td>
              <td className="py-4 text-right tabular-nums whitespace-nowrap">{formatMoney(lineTotal(item), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <p className="text-ink-muted">Total, due on acceptance</p>
        <p className="font-display text-[clamp(2.5rem,6vw,3.5rem)] leading-none tracking-[-0.02em] tabular-nums">
          {formatMoney(total, currency)}
        </p>
      </div>
    </div>
  );
}
