import Link from 'next/link';
import { PRO_MONTHLY, SETUP_TIERS, usd, type LandingV2Copy } from '@/lib/landing-v2-copy';
import { SUPPORT_CONTACT, supportWhatsAppUrl } from '@/lib/support-contact';
import { V2Calculator } from './V2Calculator';
import { V2FaqItem, V2FeatureGroup } from './V2Accordion';

const TEL = `tel:${SUPPORT_CONTACT.phoneE164}`;
const MAIL = `mailto:${SUPPORT_CONTACT.email}`;

export function V2Month({ c }: { c: LandingV2Copy }) {
  const m = c.month;
  return (
    <section className="chap tight" aria-labelledby="lv2-month">
      <div className="wrap">
        <div className="chap-head">
          <span className="stamp label">{m.label}</span>
          <h2 className="h-a" id="lv2-month">{m.h2}</h2>
          <p className="lead">{m.lead}</p>
        </div>
        <V2Calculator copy={m.calc} proMonthly={PRO_MONTHLY} />

        <div className="vs">
          <div className="vs-copy">
            <h3 className="h-c">{m.vsH3}</h3>
            <p className="verdict">{m.verdict}</p>
            <ul className="diffs">
              {m.diffs.map((d) => (
                <li key={d.b}><b>{d.b}</b>{d.t}</li>
              ))}
            </ul>
          </div>
          <div>
            <table className="cmp">
              <caption className="sr-only">{m.cmpCaption}</caption>
              <thead>
                <tr>
                  <td />
                  <th scope="col" className="us">{m.cmpHead[0]}</th>
                  <th scope="col">{m.cmpHead[1]}</th>
                  <th scope="col">{m.cmpHead[2]}</th>
                </tr>
              </thead>
              <tbody>
                {m.cmpRows.flatMap((r) => [
                  <tr key={`${r.label}-g`} className="grp" aria-hidden="true"><td colSpan={3}>{r.label}</td></tr>,
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    <td className="us">{r.us}</td>
                    <td>{r.apps}</td>
                    <td>{r.chownow}</td>
                  </tr>,
                ])}
              </tbody>
            </table>
            <p className="cmp-src">{m.cmpSource}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function V2Setup({ c }: { c: LandingV2Copy }) {
  const s = c.setup;
  const wa = supportWhatsAppUrl();
  return (
    <section className="chap alt" aria-labelledby="lv2-setup">
      <div className="wrap">
        <div className="chap-head">
          <span className="stamp label">{s.label}</span>
          <h2 className="h-b" id="lv2-setup">{s.h2}</h2>
          <p className="lead">{s.lead}</p>
        </div>
        <div className="setup-grid">
          <ol className="steps">
            {s.steps.map((st, i) => (
              <li key={st.h}>
                <span className="n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{st.h}</h3>
                  <p>{st.p}</p>
                </div>
              </li>
            ))}
          </ol>
          <aside className="contact" aria-label={s.talk}>
            <p className="k">{s.talk}</p>
            <a className="big" href={TEL}>{SUPPORT_CONTACT.phoneDisplay}</a>
            <div className="alt">
              {wa ? <a className="tlink" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
              <a className="tlink" href={MAIL}>{SUPPORT_CONTACT.email}</a>
            </div>
            <p className="tiers-h">{s.tiersTitle}</p>
            <div className="tiers">
              {s.tiers.map((label, i) => (
                <div key={label}><span>{label}</span><b>{usd(SETUP_TIERS[i])}</b></div>
              ))}
            </div>
            <p className="free">{s.free}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function V2Pricing({ c }: { c: LandingV2Copy }) {
  const p = c.pricing;
  return (
    <section className="chap" id="pricing" aria-labelledby="lv2-pricing">
      <div className="wrap">
        <div className="chap-head">
          <span className="stamp label">{p.label}</span>
          <h2 className="h-a" id="lv2-pricing">{p.h2}</h2>
        </div>
        <div className="plan">
          <div className="plan-l">
            <div className="plan-name">Pro</div>
            <div className="plan-price"><b>{usd(PRO_MONTHLY)}</b><span>{p.perMonth}</span></div>
            <p className="plan-alt">{p.altPre}<b>{p.altBold}</b>{p.altPost}</p>
            <p className="plan-zero"><b>{p.zeroBold}</b>{p.zeroRest}</p>
            <Link className="btn btn-primary" href="/signup">{c.nav.tryPro}</Link>
            <p className="small">{p.small}</p>
          </div>
          <div className="plan-r">
            {p.groups.map((g) => (
              <V2FeatureGroup key={g.title} title={g.title} items={g.items} />
            ))}
          </div>
        </div>
        <div className="plan-foot">
          {p.foot.map((f) => (
            <p key={f.b}><b>{f.b}</b>{f.t}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function V2Faq({ c }: { c: LandingV2Copy }) {
  const f = c.faq;
  return (
    <section className="chap tight alt" aria-labelledby="lv2-faq">
      <div className="wrap">
        <div className="faq-head">
          <div>
            <span className="stamp label">{f.label}</span>
            <h2 className="h-b" id="lv2-faq">{f.h2}</h2>
          </div>
          <p className="side">
            {f.side} <a className="tlink" href={MAIL}>{SUPPORT_CONTACT.email}</a>
          </p>
        </div>
        <div className="faq-grid6">
          {f.items.map((qa, i) => (
            <V2FaqItem key={qa.q} q={qa.q} a={qa.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
