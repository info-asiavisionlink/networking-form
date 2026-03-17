"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";

const WEBHOOK_URL =
  "https://nextasia.app.n8n.cloud/webhook/2983b3ab-c8e6-4cbc-8cb0-c70d7a49e625";
const STORAGE_KEY = "networking-form-draft";
const FIELD_CLASS =
  "w-full rounded-xl border border-zinc-300/90 bg-white/95 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-28`;

type ReceiptNeeded = "" | "希望する" | "希望しない";
type CompanyInfoMode = "" | "self_pr" | "company_pr" | "url";

type NetworkingFormData = {
  reception_number: string;
  name: string;
  email: string;
  company_name: string;
  job_title: string;
  target_people: string;
  ng_people: string;
  self_pr: string;
  company_pr: string;
  profile_url: string;
  company_info_mode: CompanyInfoMode;
  hobby: string;
  receipt_needed: ReceiptNeeded;
  receipt_name: string;
};

type FormErrors = Partial<Record<keyof NetworkingFormData, string>>;

const initialFormData: NetworkingFormData = {
  reception_number: "",
  name: "",
  email: "",
  company_name: "",
  job_title: "",
  target_people: "",
  ng_people: "",
  self_pr: "",
  company_pr: "",
  profile_url: "",
  company_info_mode: "",
  hobby: "",
  receipt_needed: "",
  receipt_name: "",
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function NetworkingForm() {
  const [formData, setFormData] = useState<NetworkingFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Partial<NetworkingFormData>;
      setFormData((prev) => ({ ...prev, ...parsed }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const receptionNumber = formData.reception_number.trim();

    if (!receptionNumber) {
      nextErrors.reception_number = "受付番号を入力してください。";
    } else if (!/^(?:[1-9]|[12][0-9]|30)$/.test(receptionNumber)) {
      nextErrors.reception_number =
        "受付番号は1〜30の数字で入力してください（例: 1）。";
    }
    if (!formData.name.trim()) {
      nextErrors.name = "氏名を入力してください。";
    }
    if (!formData.email.trim()) {
      nextErrors.email = "メールアドレスは必須です";
    } else if (!isValidEmail(formData.email.trim())) {
      nextErrors.email = "正しいメールアドレス形式で入力してください";
    }
    if (!formData.job_title.trim()) {
      nextErrors.job_title = "ご職業を入力してください。";
    }
    if (!formData.target_people.trim()) {
      nextErrors.target_people = "繋がりたい人を入力してください。";
    }
    if (!formData.receipt_needed) {
      nextErrors.receipt_needed = "領収書希望を選択してください。";
    }
    if (formData.receipt_needed === "希望する" && !formData.receipt_name.trim()) {
      nextErrors.receipt_name = "領収書宛名を入力してください。";
    }
    if (
      formData.company_info_mode === "url" &&
      formData.profile_url.trim() &&
      !isValidUrl(formData.profile_url.trim())
    ) {
      nextErrors.profile_url = "正しいURLを入力してください";
    }
    if (!formData.company_info_mode) {
      nextErrors.company_info_mode =
        "会社情報または自己PRの入力方法を選択してください";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus("idle");

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const mode = formData.company_info_mode as Exclude<CompanyInfoMode, "">;
      const payload = {
        reception_number: formData.reception_number,
        name: formData.name,
        email: formData.email,
        company_name: formData.company_name,
        job_title: formData.job_title,
        target_people: formData.target_people,
        ng_people: formData.ng_people,
        mode,
        self_pr: mode === "self_pr" ? formData.self_pr : "",
        company_pr: mode === "company_pr" ? formData.company_pr : "",
        profile_url: mode === "url" ? formData.profile_url : "",
        hobby: formData.hobby,
        receipt_needed: formData.receipt_needed,
        receipt_name: formData.receipt_name,
        submitted_at: new Date().toISOString(),
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Webhook request failed");
      }

      localStorage.removeItem(STORAGE_KEY);
      setSubmitStatus("success");
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof NetworkingFormData, value: string) => {
    const normalizedValue =
      field === "reception_number" ? value.replace(/[^\d]/g, "") : value;
    setFormData((prev) => {
      if (field === "company_info_mode") {
        if (normalizedValue === "self_pr") {
          return {
            ...prev,
            company_info_mode: "self_pr",
            company_pr: "",
            profile_url: "",
          };
        }
        if (normalizedValue === "company_pr") {
          return {
            ...prev,
            company_info_mode: "company_pr",
            self_pr: "",
            profile_url: "",
          };
        }
        if (normalizedValue === "url") {
          return {
            ...prev,
            company_info_mode: "url",
            self_pr: "",
            company_pr: "",
          };
        }
      }

      return { ...prev, [field]: normalizedValue };
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;
    const isTextarea = target.tagName === "TEXTAREA";

    if (event.key === "Enter" && !isTextarea) {
      event.preventDefault();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#fff8ea_0%,#f8f8f7_32%,#f2f3f5_62%,#eef0f3_100%)] px-4 py-8 text-zinc-900 sm:py-10">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-yellow-100/30 blur-3xl" />

      <main className="relative mx-auto w-full max-w-2xl">
        <header className="mb-6 px-1">
          <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-white/75 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-amber-700 backdrop-blur-sm">
            受付専用フォーム
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
            交流会参加フォーム
          </h1>
          <div className="mt-3 h-px w-24 bg-gradient-to-r from-amber-300 via-amber-200 to-transparent" />
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            受付をスムーズにするため、到着後にご入力ください
          </p>
        </header>

        <section className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(17,24,39,0.16)] backdrop-blur-sm sm:p-7">
          <form className="space-y-5" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                受付番号{" "}
                <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                  必須
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={formData.reception_number}
                onChange={(e) => handleFieldChange("reception_number", e.target.value)}
                className={FIELD_CLASS}
                placeholder="1〜30の番号を入力"
              />
              {errors.reception_number && (
                <p className="mt-1 text-sm text-red-600">{errors.reception_number}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                氏名{" "}
                <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                  必須
                </span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={FIELD_CLASS}
                placeholder="例: 山田 太郎"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                メールアドレス{" "}
                <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                  必須
                </span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className={FIELD_CLASS}
                placeholder="例：sample@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                会社名または屋号{" "}
                <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                  任意
                </span>
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleFieldChange("company_name", e.target.value)}
                className={FIELD_CLASS}
                placeholder="会社名や屋号がある場合はご入力ください"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                ご職業{" "}
                <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                  必須
                </span>
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleFieldChange("job_title", e.target.value)}
                className={FIELD_CLASS}
                placeholder="例: エンジニア"
              />
              {errors.job_title && (
                <p className="mt-1 text-sm text-red-600">{errors.job_title}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                どんな人と繋がりたいか{" "}
                <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                  必須
                </span>
              </label>
              <textarea
                value={formData.target_people}
                onChange={(e) => handleFieldChange("target_people", e.target.value)}
                className={TEXTAREA_CLASS}
                placeholder="例: 経営者、営業できる人、採用担当 など"
              />
              {errors.target_people && (
                <p className="mt-1 text-sm text-red-600">{errors.target_people}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                どんな人はNGか{" "}
                <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                  任意
                </span>
              </label>
              <textarea
                value={formData.ng_people}
                onChange={(e) => handleFieldChange("ng_people", e.target.value)}
                className={TEXTAREA_CLASS}
                placeholder="例: 保険営業、投資勧誘、MLM関連 など"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                趣味・話題づくりになること{" "}
                <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                  任意
                </span>
              </label>
              <input
                type="text"
                value={formData.hobby}
                onChange={(e) => handleFieldChange("hobby", e.target.value)}
                className={FIELD_CLASS}
                placeholder="例: サウナ、AI、旅行"
              />
            </div>

            <div>
              <p className="mb-2 text-xs text-zinc-700">
                自己紹介・会社紹介・URL掲載のいずれかを選択できます（任意）
              </p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
                    formData.company_info_mode === "self_pr"
                      ? "border-blue-500 bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-blue-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="company_info_mode"
                    className="mr-2"
                    value="self_pr"
                    checked={formData.company_info_mode === "self_pr"}
                    onChange={(e) => handleFieldChange("company_info_mode", e.target.value)}
                  />
                  自己PRを書く
                </label>
                <label
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
                    formData.company_info_mode === "company_pr"
                      ? "border-blue-500 bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-blue-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="company_info_mode"
                    className="mr-2"
                    value="company_pr"
                    checked={formData.company_info_mode === "company_pr"}
                    onChange={(e) => handleFieldChange("company_info_mode", e.target.value)}
                  />
                  会社PRを書く
                </label>
                <label
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
                    formData.company_info_mode === "url"
                      ? "border-blue-500 bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-blue-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="company_info_mode"
                    className="mr-2"
                    value="url"
                    checked={formData.company_info_mode === "url"}
                    onChange={(e) => handleFieldChange("company_info_mode", e.target.value)}
                  />
                  URLを貼る
                </label>
              </div>
              {errors.company_info_mode && (
                <p className="mb-2 text-sm text-red-600">{errors.company_info_mode}</p>
              )}

              {formData.company_info_mode === "self_pr" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    自己PR{" "}
                    <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                      任意
                    </span>
                  </label>
                  <p className="mb-2 text-xs text-zinc-700">
                    個人としてどんな人と繋がりたいか、今回の交流会で何を得たいかなどをご自由にご記入ください
                  </p>
                  <textarea
                    value={formData.self_pr}
                    onChange={(e) => handleFieldChange("self_pr", e.target.value)}
                    className={`${FIELD_CLASS} min-h-36 border-2 border-yellow-400 shadow-[0_0_0_3px_rgba(250,204,21,0.18)] transition-colors duration-200`}
                    placeholder={`例：
・こんな人脈の方と繋がりたい
・交流会で新しい仕事のきっかけを作りたい
・営業や経営に関する情報交換をしたい
・将来的に事業を広げていきたい
・一緒に挑戦できる仲間と出会いたい`}
                  />
                </div>
              )}

              {formData.company_info_mode === "company_pr" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    会社PR{" "}
                    <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                      任意
                    </span>
                  </label>
                  <textarea
                    value={formData.company_pr}
                    onChange={(e) => handleFieldChange("company_pr", e.target.value)}
                    className={`${FIELD_CLASS} min-h-36 border-2 border-yellow-400 shadow-[0_0_0_3px_rgba(250,204,21,0.18)] transition-colors duration-200`}
                    placeholder={`例：
・会社の事業内容
・提供しているサービス
・他社との違い
・今後強化したいこと`}
                  />
                </div>
              )}

              {formData.company_info_mode === "url" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    会社サイト・SNS・ポートフォリオURL{" "}
                    <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                      任意
                    </span>
                  </label>
                  <input
                    type="url"
                    value={formData.profile_url}
                    onChange={(e) => handleFieldChange("profile_url", e.target.value)}
                    className={`${FIELD_CLASS} border-2 border-yellow-400 shadow-[0_0_0_3px_rgba(250,204,21,0.18)] transition-colors duration-200`}
                    placeholder="例：https://example.com"
                  />
                  {errors.profile_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.profile_url}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <fieldset>
                <legend className="mb-2 block text-sm font-semibold">
                  領収書希望{" "}
                  <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                    必須
                  </span>
                </legend>
                <div className="flex gap-3">
                  <label className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white/80 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <input
                      type="radio"
                      name="receipt_needed"
                      className="mr-2"
                      value="希望する"
                      checked={formData.receipt_needed === "希望する"}
                      onChange={(e) => handleFieldChange("receipt_needed", e.target.value)}
                    />
                    希望する
                  </label>
                  <label className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white/80 px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <input
                      type="radio"
                      name="receipt_needed"
                      className="mr-2"
                      value="希望しない"
                      checked={formData.receipt_needed === "希望しない"}
                      onChange={(e) => handleFieldChange("receipt_needed", e.target.value)}
                    />
                    希望しない
                  </label>
                </div>
                {errors.receipt_needed && (
                  <p className="mt-1 text-sm text-red-600">{errors.receipt_needed}</p>
                )}
              </fieldset>
            </div>

            {formData.receipt_needed === "希望する" && (
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  領収書宛名{" "}
                  <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700">
                    必須
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.receipt_name}
                  onChange={(e) => handleFieldChange("receipt_name", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="例: 株式会社サンプル"
                />
                {errors.receipt_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.receipt_name}</p>
                )}
              </div>
            )}

            {submitStatus === "success" && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm">
                送信完了しました。受付スタッフへ画面をご提示ください。
              </p>
            )}

            {submitStatus === "error" && (
              <p className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm">
                送信に失敗しました。通信環境をご確認のうえ、再度お試しください。
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="relative min-h-12 w-full rounded-xl border border-amber-200/40 bg-zinc-900 px-4 py-3 text-base font-semibold text-white shadow-[0_10px_26px_rgba(15,23,42,0.24)] transition hover:bg-black disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-400 disabled:shadow-none"
            >
              {isSubmitting ? "送信中..." : "内容を送信する"}
            </button>

            <p className="rounded-lg border border-zinc-200/90 bg-white/70 px-3 py-2 text-xs leading-relaxed text-zinc-600">
              入力内容は交流会でのマッチングや受付管理のために利用されます。
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
