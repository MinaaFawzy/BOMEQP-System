import { useTranslation } from 'react-i18next';
import {
  Users,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Award,
  FileText
} from "lucide-react";

const getInitials = (firstName = "", lastName = "") =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

const getStatusConfig = (status, t) => {
  switch (status) {
    case "success":
      return {
        label: t('trainee_section.status_success', { defaultValue: 'Success' }),
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        icon: <CheckCircle2 size={12} />,
      };

    case "fail":
      return {
        label: t('trainee_section.status_fail', { defaultValue: 'Fail' }),
        className: "bg-rose-50 text-rose-700 border border-rose-200",
        icon: <XCircle size={12} />,
      };

    default:
      return {
        label: t('trainee_section.status_na', { defaultValue: 'N/A' }),
        className: "bg-slate-100 text-slate-600 border border-slate-200",
        icon: null,
      };
  }
};

const TraineeSection = ({
  trainees = [],
  mode = "view",
  grades = {},
  onGradeChange,
  t,
  className = "",
}) => {
  const { t: tCommon } = useTranslation('common');

  if (!trainees?.length) {
    return (
      <div className={`rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center ${className}`}>
        <Users size={40} className="mx-auto mb-4 text-slate-400" />
        <p className="font-semibold text-slate-800">
          {t("classes_screen.details.no_enrolled")}
        </p>
        <p className="text-sm text-slate-500">
          {t("classes_screen.trainees.no_trainees")}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {trainees.map((trainee, index) => {
        const traineeId = trainee.id || trainee.trainee_id || index;
        const status = getStatusConfig(trainee.exam_status, tCommon);
        const hasCertificate =
          trainee.certificate !== null && trainee.certificate !== undefined;

        return (
          <div
            key={traineeId}
            className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left */}
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow">
                  {getInitials(trainee.first_name, trainee.last_name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-slate-900">
                      {trainee.first_name} {trainee.last_name}
                    </h3>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                    {trainee.email && (
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail size={14} className="shrink-0" />
                        <span className="truncate">{trainee.email}</span>
                      </div>
                    )}

                    {trainee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{trainee.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-4">
                {/* Grade */}
                <div className="flex min-w-[90px] flex-col justify-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("classes_screen.form.grade", { defaultValue: "Grade" })}
                  </p>

                  {mode === "view" ? (
                    <p className="mt-1 text-2xl font-bold leading-none text-slate-900">
                      {trainee.exam_score ?? "-"}
                    </p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={grades[traineeId] ?? ""}
                      onChange={(e) =>
                        onGradeChange && onGradeChange(traineeId, e.target.value)
                      }
                      disabled={hasCertificate}
                      className={`no-spinner mt-1 h-11 w-20 rounded-xl border text-center text-base font-semibold outline-none transition ${hasCertificate
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        }`}
                      placeholder="0"
                    />
                  )}
                </div>

                {/* Certificate buttons */}
                {trainee.certificate?.certificate_pdf_url && (
                  <button
                    onClick={() =>
                      window.open(
                        trainee.certificate.certificate_pdf_url,
                        "_blank"
                      )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Award size={16} />
                    {tCommon('trainee_section.certificate', { defaultValue: 'Certificate' })}
                  </button>
                )}

                {trainee.certificate?.card_pdf_url && (
                  <button
                    onClick={() =>
                      window.open(trainee.certificate.card_pdf_url, "_blank")
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    <FileText size={16} />
                    {tCommon('trainee_section.card', { defaultValue: 'Card' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TraineeSection;
