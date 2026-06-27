"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Star,
  Eye,
  EyeOff,
  MessageSquare,
  TrendingUp,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLocale } from "@/hooks/use-dashboard-locale";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  created_at: string;
  order_id: string | null;
  owner_response: string | null;
  ai_suggested_response: string | null;
}

interface ReplyState {
  generating: boolean;
  draft: string;
  saved: boolean;
}

interface Props {
  restaurantId: string;
  initialReviews: Review[];
  restaurantName?: string;
  locale?: string;
}

export function ReviewsManager({
  restaurantId,
  initialReviews,
  restaurantName = "",
  locale = "es",
}: Props) {
  const { t } = useDashboardLocale();
  const [reviews, setReviews] = useState(initialReviews);
  const [isPending, startTransition] = useTransition();
  const [replyStates, setReplyStates] = useState<Record<string, ReplyState>>(
    {},
  );

  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const visible = reviews.filter((r) => r.is_visible).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  const toggleVisibility = (id: string) => {
    const review = reviews.find((r) => r.id === id);
    if (!review) return;
    const newVisible = !review.is_visible;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_visible: newVisible } : r)),
    );

    startTransition(async () => {
      try {
        const res = await fetch("/api/tenant/reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_visible: newVisible }),
        });
        if (!res.ok) {
          setReviews((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, is_visible: !newVisible } : r,
            ),
          );
        }
      } catch {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, is_visible: !newVisible } : r,
          ),
        );
      }
    });
  };

  const generateAiReply = async (review: Review) => {
    setReplyStates((prev) => ({
      ...prev,
      [review.id]: { generating: true, draft: "", saved: false },
    }));
    try {
      const res = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.id,
          rating: review.rating,
          comment: review.comment ?? "",
          customerName: review.customer_name,
          restaurantName,
          locale,
        }),
      });
      const data = (await res.json()) as {
        suggestion?: string;
        error?: string;
      };
      if (!res.ok || !data.suggestion)
        throw new Error(data.error ?? "Error generando respuesta");
      setReplyStates((prev) => ({
        ...prev,
        [review.id]: {
          generating: false,
          draft: data.suggestion!,
          saved: false,
        },
      }));
    } catch {
      setReplyStates((prev) => ({
        ...prev,
        [review.id]: { generating: false, draft: "", saved: false },
      }));
    }
  };

  const saveReply = async (id: string) => {
    const state = replyStates[id];
    if (!state?.draft.trim()) return;

    try {
      const res = await fetch("/api/tenant/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, owner_response: state.draft.trim() }),
      });
      if (!res.ok) return;
      // Actualizar el review en estado local con la respuesta guardada
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, owner_response: state.draft.trim() } : r,
        ),
      );
      setReplyStates((prev) => ({ ...prev, [id]: { ...state, saved: true } }));
    } catch {
      // sin-op: el usuario puede reintentar
    }
  };

  const startEdit = (review: Review) => {
    setReplyStates((prev) => ({
      ...prev,
      [review.id]: {
        generating: false,
        draft: review.owner_response ?? "",
        saved: false,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="dash-heading">{t.nav_reviews}</h1>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t.reviews_average}
          value={avg > 0 ? avg.toFixed(1) : "—"}
          icon={<Star className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label={t.reviews_total}
          value={String(total)}
          icon={<MessageSquare className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label={t.reviews_visible}
          value={String(visible)}
          icon={<Eye className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label={t.reviews_hidden}
          value={String(total - visible)}
          icon={<EyeOff className="w-5 h-5" />}
          color="gray"
        />
      </div>

      {/* Distribution */}
      <div className="dash-card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />{" "}
          {t.reviews_distribution}
        </h3>
        <div className="space-y-2.5">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 w-16">
                <span className="text-sm font-medium text-gray-700">
                  {star}
                </span>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-500 w-8 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="dash-card p-10 text-center">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">
            {t.reviews_noReviews}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t.reviews_noReviewsDesc}
          </p>
          <Link
            href="/app/marketing"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t.nav_marketing ?? "Ir a Marketing"}
          </Link>
        </div>
      ) : (
        <div className="dash-card divide-y divide-gray-100">
          {reviews.map((r) => {
            const reply = replyStates[r.id];
            const isEditing = reply !== undefined && !reply.saved;
            const hasResponse = r.owner_response && !isEditing;

            return (
              <div
                key={r.id}
                className={cn(
                  "p-4 flex items-start gap-4",
                  !r.is_visible && "opacity-50",
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.customer_name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-3.5 h-3.5",
                            s <= r.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-200",
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400 ml-auto">
                      {new Date(r.created_at).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {r.comment}
                    </p>
                  )}

                  {/* Sección de respuesta del dueño */}
                  <div className="mt-3">
                    {hasResponse && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Tu respuesta:
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {r.owner_response}
                        </p>
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="mt-2 text-[11px] text-purple-600 hover:text-purple-700 font-medium transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    )}

                    {!hasResponse && !isEditing && (
                      <button
                        type="button"
                        onClick={() => generateAiReply(r)}
                        disabled={reply?.generating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generar respuesta IA
                      </button>
                    )}

                    {isEditing && (
                      <div className="mt-1 space-y-2">
                        {reply.generating ? (
                          <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                        ) : (
                          <>
                            <textarea
                              rows={3}
                              value={reply.draft}
                              onChange={(e) =>
                                setReplyStates((prev) => ({
                                  ...prev,
                                  [r.id]: {
                                    ...prev[r.id],
                                    draft: e.target.value,
                                  },
                                }))
                              }
                              className="w-full text-sm text-gray-700 border border-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                              placeholder="Escribe tu respuesta..."
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveReply(r.id)}
                                disabled={!reply.draft.trim()}
                                className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Guardar respuesta
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyStates((prev) => {
                                    const next = { ...prev };
                                    delete next[r.id];
                                    return next;
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVisibility(r.id)}
                  disabled={isPending}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex-shrink-0",
                    r.is_visible
                      ? "hover:bg-red-50 text-gray-400 hover:text-red-500"
                      : "hover:bg-emerald-50 text-gray-400 hover:text-emerald-500",
                  )}
                  title={
                    r.is_visible ? t.reviews_hideReview : t.reviews_showReview
                  }
                >
                  {r.is_visible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    gray: { bg: "bg-gray-50", text: "text-gray-500" },
  };
  const c = colors[color] ?? colors.gray;

  return (
    <div className="dash-card p-4">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          c.bg,
        )}
      >
        <span className={c.text}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
