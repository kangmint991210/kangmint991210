// 생성 결과를 보여 주는 카드들.
//
// Card 가 문서 종류에 맞는 카드를 고르고, 각 카드는 CardShell 로 겉모습을 통일합니다.
// ctx 는 "이 문서를 어떻게 내보내고 고칠 수 있는지"를 담아 아래로 전달합니다.
// ctx 가 없으면(랜딩 샘플 등) 읽기 전용 카드가 됩니다.

import React, { useState } from "react";
import {
  Target, Package, ListOrdered, ShieldCheck, Clock, MapPin, Copy, Check, Download, Lock,
} from "lucide-react";
import { arr, stripLeadingNumber as stripNum } from "../../lib/utils.js";
import { DOMAIN_COLOR, domainEmoji as dEmoji, LIFE_LEVELS } from "../../domain/documents.js";
import { copyDoc, downloadDoc } from "../../domain/document-export.js";
import { Editable, Sec } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";

/* ---------- 내보내기 (표 복사 · 파일 저장) ---------- */
// 표 서식(text/html)까지 클립보드에 넣기 때문에 한글·워드에 그대로 붙습니다.
// 파일 저장은 유료 플랜의 핵심 혜택이라 무료 플랜에서는 요금제 안내로 연결합니다.

export function ExportBar({ ctx }) {
  const [done, setDone] = useState("");
  if (!ctx) return null;
  const { kind, payload, guest, canExport, onNeedSignup, onNeedPlan } = ctx;

  const flash = (k) => { setDone(k); setTimeout(() => setDone(""), 1600); };

  const doCopy = async () => {
    if (guest) { onNeedSignup?.("copy"); return; }
    const ok = await copyDoc(kind, payload);
    if (ok) flash("copy");
  };
  const doDownload = () => {
    if (guest) { onNeedSignup?.("save"); return; }
    if (!canExport) { onNeedPlan?.(); return; }
    if (downloadDoc(kind, payload)) flash("dl");
  };

  return (
    <div style={styles.exportBar}>
      <button style={{ ...styles.copyBtn, ...(done === "copy" ? styles.copyDone : {}) }}
        onClick={doCopy} title="표 서식 그대로 복사 — 한글·워드에 붙여넣기">
        {done === "copy" ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 표로 복사</>}
      </button>
      <button style={{ ...styles.copyBtn, ...(done === "dl" ? styles.copyDone : {}) }}
        onClick={doDownload} title="워드·한글에서 열리는 파일로 저장">
        {done === "dl" ? <><Check size={13} /> 저장됨</> : <><Download size={13} /> 파일 저장</>}
        {!guest && !canExport && <Lock size={10} style={{ marginLeft: 2, color: "#B08900" }} />}
      </button>
    </div>
  );
}

export function Card({ kind, p, guest, canExport, onEdit, onNeedSignup, onNeedPlan }) {
  const ctx = (payload) => ({ kind, payload, guest, canExport, onNeedSignup, onNeedPlan, editable: !!onEdit });
  if (kind === "play")
    return <>{arr(p.activities).map((a, i) => (
      <ActivityCard key={i} a={a} base={["activities", i]} onEdit={onEdit} ctx={ctx({ activities: [a] })} />
    ))}</>;
  if (kind === "daily" && p.daily) return <DailyCard d={p.daily} base={["daily"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "obs" && p.observation) return <ObsCard o={p.observation} base={["observation"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "note" && p.note) return <NoteCard n={p.note} base={["note"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "adapt" && p.adapt) return <AdaptCard a={p.adapt} base={["adapt"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "counsel" && p.counsel) return <CounselCard c={p.counsel} base={["counsel"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "life" && p.life) return <LifeCard l={p.life} base={["life"]} onEdit={onEdit} ctx={ctx(p)} />;
  return null;
}

export function CardShell({ stripe, title, badge, ctx, children, foot }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardBar, background: stripe }} />
      <div style={styles.cardInner}>
        <div style={styles.docHead}>
          <div style={styles.docHeadMain}>
            {badge && <span style={styles.docBadge}>{badge}</span>}
            <h3 style={styles.cardTitle}>{title}</h3>
          </div>
          <ExportBar ctx={ctx} />
        </div>
        {ctx?.editable && (
          <div style={styles.editHint}>✏️ 고치고 싶은 문장을 누르면 바로 수정할 수 있어요.</div>
        )}
        {children}
        {foot && <div style={styles.footnote}>📝 {foot}</div>}
      </div>
    </div>
  );
}

export function ActivityCard({ a, base = [], onEdit, ctx }) {
  const stripe = arr(a.domains).map((d) => DOMAIN_COLOR[d]).filter(Boolean)[0] || "#45C4A8";
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe={stripe} title={a.title} ctx={ctx}
      badge={<span style={styles.tagRow2}>{arr(a.domains).map((d) => <span key={d} style={{ ...styles.tag, background: (DOMAIN_COLOR[d] || "#aaa") + "33", color: "#5c6b64" }}>{dEmoji(d)} {d}</span>)}</span>}>
      <div style={styles.meta}>
        {a.age && <span style={styles.metaItem}>👶 {a.age}</span>}
        {a.place && <span style={styles.metaItem}><MapPin size={12} /> {a.place}</span>}
        {a.duration && <span style={styles.metaItem}><Clock size={12} /> {a.duration}</span>}
      </div>
      {a.goal && <Sec icon={<Target size={14} />} label="목표" tint="#FFEFD6">
        <Editable value={a.goal} path={at("goal")} onEdit={onEdit} style={styles.body} /></Sec>}
      {arr(a.materials).length > 0 && <Sec icon={<Package size={14} />} label="준비물" tint="#E8F6EE"><div style={styles.matWrap}>{arr(a.materials).map((m, i) => <span key={i} style={styles.matChip}>{m}</span>)}</div></Sec>}
      {arr(a.steps).length > 0 && (
        <Sec icon={<ListOrdered size={14} />} label="이렇게 놀아요" tint="#E5F7F0">
          <ol style={styles.steps}>
            {arr(a.steps).map((s, i) => (
              <li key={i} style={styles.step}>
                <span style={{ ...styles.stepNum, background: stripe }}>{i + 1}</span>
                <Editable value={stripNum(s)} path={at("steps", i)} onEdit={onEdit} style={styles.stepText} />
              </li>
            ))}
          </ol>
        </Sec>
      )}
      {a.extension && <Sec icon={<span style={{ fontSize: 14 }}>✨</span>} label="이렇게 더!" tint="#EDE8FA">
        <Editable value={a.extension} path={at("extension")} onEdit={onEdit} style={styles.body} /></Sec>}
      {a.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{a.safety}</span></div>}
    </CardShell>
  );
}

// 관찰기록 한 영역에 들어가는 항목들. 순서와 이름을 여기서만 정합니다.
// (프롬프트의 JSON 키와 짝이 맞아야 합니다 — src/prompts/obs.js)
const OBS_FIELDS = [
  { key: "datePlace", label: "관찰 일시 및 장소", style: "obsFieldVal" },
  { key: "record", label: "관찰내용", style: "obsFieldVal" },
  { key: "interpretation", label: "해석 및 평가", style: "obsInterp" },
  { key: "learning", label: "배움읽기", style: "obsLearning" },
  { key: "homeConnection", label: "가정-기관 연계 방안", style: "obsHome" },
];

export function ObsCard({ o, base = [], onEdit, ctx }) {
  const meta = [o.gender && `${o.gender}`, o.birth && `🎂 ${o.birth}`, o.period && `🗓️ ${o.period}`, o.recorder && `✍️ ${o.recorder}`].filter(Boolean);
  const areas = arr(o.areas);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#8FCDF2" title={`${o.child || "영유아"} 관찰기록`} badge="원장님 제출용" ctx={ctx}
      foot="제출 전 아동 정보·관찰기간과 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {areas.map((a, i) => (
        <div key={i} style={styles.obsArea}>
          <div style={styles.obsAreaHead}><span style={styles.obsTag}>{a.area}</span></div>
          {/* 예전에 저장한 문서에는 배움읽기·가정연계가 없으므로 있는 항목만 그립니다 */}
          {OBS_FIELDS.map(({ key, label, style }) =>
            a[key] ? (
              <div key={key} style={styles.obsField}>
                <span style={styles.obsFieldLabel}>{label}</span>
                <Editable
                  value={a[key]}
                  path={at("areas", i, key)}
                  onEdit={onEdit}
                  multiline={key !== "datePlace"}
                  style={styles[style]}
                />
              </div>
            ) : null
          )}
        </div>
      ))}
      {o.summary && <Sec icon={<span style={{ fontSize: 14 }}>🧠</span>} label="종합 해석 (비고)" tint="#EDE8FA">
        <Editable value={o.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}

export function NoteCard({ n, base = [], onEdit, ctx }) {
  return (
    <CardShell stripe="#FF9E7D" title="오늘의 알림장" badge="학부모님께" ctx={ctx}>
      <Editable value={n.message} path={[...base, "message"]} onEdit={onEdit} style={styles.noteBody} />
      {n.homeTip && (
        <div style={styles.homeTipWrap}>
          <span style={styles.homeTipIcon}>💛</span>
          <Editable value={n.homeTip} path={[...base, "homeTip"]} onEdit={onEdit} style={styles.homeTip} />
        </div>
      )}
    </CardShell>
  );
}

export function DailyCard({ d, base = [], onEdit, ctx }) {
  const meta = [d.klass && `🏫 ${d.klass}`, d.age && `👶 ${d.age}`, d.theme && `🌱 ${d.theme}`, d.nextTheme && `🔜 다음: ${d.nextTheme}`].filter(Boolean);
  const sched = arr(d.schedule);
  const areas = arr(d.areas);
  const days = arr(d.days);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#59C7B0" title={`${d.week || ""} 보육일지`} badge="주간 보육일지" ctx={ctx}
      foot="제출 전 양식(주제·요일·일과)에 맞춰 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}

      {sched.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>🕒</span>} label="하루 일과" tint="#FFF3E0">
          <div style={styles.schedList}>
            {sched.map((s, i) => (
              <div key={i} style={styles.schedRow}>
                <div style={styles.schedTop}><span style={styles.schedName}>{s.name}</span>{s.time && <span style={styles.schedTime}>{s.time}</span>}</div>
                {s.content && (
                  <Editable value={s.content} path={at("schedule", i, "content")} onEdit={onEdit} style={styles.schedContent} />
                )}
              </div>
            ))}
          </div>
        </Sec>
      )}

      {areas.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>🧩</span>} label="오전 실내놀이 (영역별)" tint="#E5F7F0">
          <div style={styles.weeks}>
            {areas.map((a, i) => (
              <div key={i} style={styles.week}>
                <div style={styles.weekHead}><span style={styles.weekTag}>{a.area}</span></div>
                <Editable value={a.content} path={at("areas", i, "content")} onEdit={onEdit} style={styles.body} />
              </div>
            ))}
          </div>
        </Sec>
      )}
      {d.outdoor && <Sec icon={<span style={{ fontSize: 14 }}>🌳</span>} label="실외놀이" tint="#E7F2FB">
        <Editable value={d.outdoor} path={at("outdoor")} onEdit={onEdit} style={styles.body} /></Sec>}

      {days.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>📝</span>} label="실행 놀이 평가 및 지원계획" tint="#FDEBF1">
          <div style={styles.weeks}>
            {days.map((x, i) => {
              const read = arr(x.reading).filter(Boolean);
              const hasNew = x.playEval || x.supportPlan || read.length > 0;
              return (
                <div key={i} style={styles.week}>
                  <div style={styles.weekHead}><span style={styles.weekTag}>{x.day}</span></div>
                  {x.playEval && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>놀이평가(배움읽기)</span>
                      <Editable value={x.playEval} path={at("days", i, "playEval")} onEdit={onEdit} style={styles.body} />
                    </div>
                  )}
                  {x.supportPlan && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>놀이와 배움지원계획</span>
                      <Editable value={x.supportPlan} path={at("days", i, "supportPlan")} onEdit={onEdit} style={styles.body} />
                    </div>
                  )}
                  {read.length > 0 && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>배움읽기</span>
                      <ul style={styles.readList}>
                        {read.map((r, j) => (
                          <li key={j} style={styles.readItem}>
                            <Editable value={r} path={at("days", i, "reading", j)} onEdit={onEdit} style={styles.readItemText} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 이전 버전으로 저장된 문서(record 한 덩어리) 호환 */}
                  {!hasNew && x.record && (
                    <Editable value={x.record} path={at("days", i, "record")} onEdit={onEdit} style={styles.body} />
                  )}
                </div>
              );
            })}
          </div>
        </Sec>
      )}
      {d.weekEval && <Sec icon={<span style={{ fontSize: 14 }}>📊</span>} label="주간 보육 평가" tint="#EDE8FA">
        <Editable value={d.weekEval} path={at("weekEval")} onEdit={onEdit} style={styles.bodyPara} /></Sec>}
      {d.special && <Sec icon={<span style={{ fontSize: 14 }}>📌</span>} label="반 운영 특이사항" tint="#F1F9F5">
        <Editable value={d.special} path={at("special")} onEdit={onEdit} style={styles.body} /></Sec>}
      {d.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{d.safety}</span></div>}
    </CardShell>
  );
}

// 적응일지 한 일차에 들어가는 본문 항목. 프롬프트의 JSON 키와 짝이 맞아야 합니다.
// (src/prompts/adapt.js)
const ADAPT_FIELDS = [
  { key: "record", label: "관찰내용", style: "obsFieldVal" },
  { key: "interpretation", label: "해석 및 교사지원", style: "obsInterp" },
  { key: "homeConnection", label: "가정과의 연계", style: "obsHome" },
];

export function AdaptCard({ a, base = [], onEdit, ctx }) {
  const meta = [a.age && `👶 ${a.age}`, a.klass && `🏫 ${a.klass}`, a.birth && `🎂 ${a.birth}`, a.period && `🗓️ ${a.period}`].filter(Boolean);
  const days = arr(a.days);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#C9A7E8" title={`${a.child || "신입원아"} 적응일지`} badge="원장님 제출용" ctx={ctx}
      foot="제출 전 아동 정보·일차별 날짜와 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {days.map((x, i) => (
        <div key={i} style={styles.adaptDay}>
          <div style={styles.adaptDayHead}>
            <span style={styles.adaptTag}>{x.day}</span>
            {x.date && <span style={styles.obsDate}>{x.date}</span>}
            {x.level && <span style={styles.levelTag(x.level)}>{x.level}</span>}
            {x.note && <span style={styles.adaptNote}>비고 · {x.note}</span>}
          </div>
          {(x.arrive || x.leave || (x.health && x.health !== "-")) && (
            <div style={styles.adaptTime}>
              🕘 등원 {x.arrive || "-"} · 하원 {x.leave || "-"}
              {x.health && x.health !== "-" ? ` · 💊 ${x.health}` : ""}
            </div>
          )}
          {/* 예전에 저장한 문서에는 record 만 있으므로 있는 항목만 그립니다 */}
          {ADAPT_FIELDS.map(({ key, label, style }) =>
            x[key] ? (
              <div key={key} style={styles.obsField}>
                <span style={styles.adaptFieldLabel}>{label}</span>
                <Editable value={x[key]} path={at("days", i, key)} onEdit={onEdit} style={styles[style]} />
              </div>
            ) : null
          )}
        </div>
      ))}
      {a.summary && <Sec icon={<span style={{ fontSize: 14 }}>🌱</span>} label="종합 의견 및 적응 계획" tint="#EDE8FA">
        <Editable value={a.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}

// 생활기록부. 항목 8개 × 상·중·하 3줄을 개조식 블릿으로 보여 줍니다.
// 수준을 배열이 아닌 고정 키(high/mid/low)로 받으므로, 한 줄이 비어도 나머지가 밀리지 않습니다.
export function LifeCard({ l, base = [], onEdit, ctx }) {
  const meta = [l.age && `👶 ${l.age}`, l.klass && `🏫 ${l.klass}`, l.date && `📅 ${l.date}`].filter(Boolean);
  const items = arr(l.items);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#93D9B0" title={`${l.child || "영유아"} 생활기록부`} badge="기본생활습관 및 활동발달상황" ctx={ctx}
      foot="제출 전 원아 정보와 항목별 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {items.map((it, i) => (
        <div key={i} style={styles.lifeArea}>
          <div style={styles.obsAreaHead}><span style={styles.lifeTag}>{it.area}</span></div>
          <ul style={styles.lifeList}>
            {LIFE_LEVELS.map(({ key, label, color, tint }) =>
              it[key] ? (
                <li key={key} style={styles.lifeItem}>
                  <span style={styles.lifeLevel(color, tint)}>{label}</span>
                  <Editable value={it[key]} path={at("items", i, key)} onEdit={onEdit} style={styles.lifeText} />
                </li>
              ) : null
            )}
          </ul>
        </div>
      ))}
    </CardShell>
  );
}

export function CounselCard({ c, base = [], onEdit, ctx }) {
  const meta = [c.klass && `🏫 ${c.klass}`, c.age && `👶 ${c.age}`, c.birth && `🎂 ${c.birth}`, c.date && `📅 ${c.date}`, c.method && `💬 ${c.method}`, c.guardian && `👪 ${c.guardian}`, c.teacher && `✍️ ${c.teacher}`].filter(Boolean);
  const domains = arr(c.domains);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#FFC074" title={`${c.child || "원아"} 상담일지`} badge="학부모 상담" ctx={ctx}
      foot="제출 전 원아 정보·면담 정보와 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {domains.map((d, i) => (
        <div key={i} style={styles.cnslArea}>
          <div style={styles.obsAreaHead}><span style={styles.cnslTag}>{d.area}</span></div>
          {d.content && <Editable value={d.content} path={at("domains", i, "content")} onEdit={onEdit} style={styles.body} />}
        </div>
      ))}
      {c.parentNote && <Sec icon={<span style={{ fontSize: 14 }}>🗣️</span>} label="부모 의견" tint="#E7F2FB">
        <Editable value={c.parentNote} path={at("parentNote")} onEdit={onEdit} style={styles.body} /></Sec>}
      {/* 예전에 저장한 상담일지에는 없는 항목이라 있을 때만 그립니다 */}
      {c.homeConnection && <Sec icon={<span style={{ fontSize: 14 }}>🏠</span>} label="가정-기관 연계 지원 방안" tint="#FFF6EA">
        <Editable value={c.homeConnection} path={at("homeConnection")} onEdit={onEdit} style={styles.obsHome} /></Sec>}
      {c.summary && <Sec icon={<span style={{ fontSize: 14 }}>📋</span>} label="면담내용 및 종합의견" tint="#EDE8FA">
        <Editable value={c.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}
