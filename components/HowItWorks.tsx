import { Database, LockKeyhole, RotateCcw, Search } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Resolve", text: "Enter a GIWA address or an active up.id name. Suho resolves it on-chain before anything else." },
  { icon: Database, title: "Review", text: "Read Dojang identity, SuhoRegistry status, report count, and related recall activity in one verdict." },
  { icon: LockKeyhole, title: "Guard", text: "Route value through GuardedSend after recipient status is known." },
  { icon: RotateCcw, title: "Recall", text: "Cancel within the ten-minute window, or claim after it. Flagged recipients can never claim." }
] as const;

export function HowItWorks() {
  return (
    <section className="section container" id="how">
      <div className="section__head" data-reveal>
        <span className="eyebrow">Operating model</span>
        <h2 className="section__title">Review first. Settle second.</h2>
        <p className="section__lede">
          Suho keeps wallet, network, recipient, registry, and recall state in one console, so each transfer starts with a check.
        </p>
      </div>
      <div className="steps">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="step" key={step.title} data-reveal>
              <span className="step__num">0{index + 1}</span>
              <span className="step__idx"><Icon size={18} /></span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
