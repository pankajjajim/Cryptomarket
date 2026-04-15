import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatNumber,
  formatPrice,
  getChangeColor,
} from "../utils/coinFormatting.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { loadRazorpayScript } from "../utils/razorpay.js";

const COINLORE_API_URL = import.meta.env.DEV
  ? "/coinlore-api/api/tickers/"
  : "https://api.coinlore.net/api/tickers/";

function sortByVariant(variant, data) {
  const list = Array.isArray(data) ? [...data] : [];

  if (variant === "trending") {
    return list.sort((a, b) => {
      const a24 = Math.abs(parseFloat(a.percent_change_24h) || 0);
      const b24 = Math.abs(parseFloat(b.percent_change_24h) || 0);
      return b24 - a24;
    });
  }

  if (variant === "new") {
    return list.sort((a, b) => {
      const capA = parseFloat(a.market_cap_usd) || 0;
      const capB = parseFloat(b.market_cap_usd) || 0;
      return capA - capB;
    });
  }

  if (variant === "mostVisited") {
    return list.sort((a, b) => {
      const volA = parseFloat(a.volume24) || 0;
      const volB = parseFloat(b.volume24) || 0;
      return volB - volA;
    });
  }

  if (variant === "gainers") {
    return list.sort((a, b) => {
      const changeA = parseFloat(a.percent_change_24h) || 0;
      const changeB = parseFloat(b.percent_change_24h) || 0;
      return changeB - changeA;
    });
  }

  // 'top' (no extra sorting)
  return list;
}

function handleBuy(crypto, buyCrypto, navigate) {
  // Check if user is logged in
  if (!buyCrypto) {
    alert("Please login to buy cryptocurrencies.");
    navigate("/login");
    return;
  }

  const symbol = (crypto.symbol || "").toUpperCase();
  const name = crypto.name || "this coin";
  const price = parseFloat(crypto.price_usd) || 0;

  const qtyStr = prompt(
    `Buy ${name} (${symbol})\n\nCurrent Price: $${price.toFixed(2)}\n\nEnter quantity:`,
    "1",
  );
  if (qtyStr === null) return;

  const qty = Number(qtyStr);
  if (!Number.isFinite(qty) || qty <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }

  const total = qty * price;

  if (
    confirm(
      `Confirm Purchase:\n\n${qty} ${symbol}\nPrice: $${price.toFixed(2)} each\nTotal: $${total.toFixed(2)}\n\nProceed with purchase?`,
    )
  ) {
    // Call the API to record the purchase
    buyCrypto(symbol, qty, price)
      .then((result) => {
        if (result.success) {
          alert(
            `Purchase successful!\n\n${qty} ${symbol} purchased for $${total.toFixed(2)}`,
          );
        } else {
          alert("Purchase failed: " + result.error);
        }
      })
      .catch((error) => {
        alert("Network error. Please try again.");
      });
  }
}

function getVariantTitle(variant) {
  if (variant === "trending") return "Trending";
  if (variant === "mostVisited") return "Most Visited";
  if (variant === "new") return "New";
  if (variant === "gainers") return "Gainers";
  return "Top";
}

export default function CryptoListPage({ variant }) {
  const navigate = useNavigate();
  const { buyCrypto, isAuthenticated, token, user } = useAuth();
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeframe, setTimeframe] = useState("24h");
  const [paymentCoin, setPaymentCoin] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [payMethod, setPayMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentGatewayEnabled, setPaymentGatewayEnabled] = useState(false);
  const [gatewayKeyId, setGatewayKeyId] = useState("");
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [usdInrRate, setUsdInrRate] = useState(83);

  const title = useMemo(() => getVariantTitle(variant), [variant]);

  useEffect(() => {
    document.title = `Crypto Market - ${title}`;
  }, [title]);

  useEffect(() => {
    let intervalId;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(COINLORE_API_URL);
        if (!response.ok) {
          throw new Error("HTTP error! status: " + response.status);
        }

        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid data format");
        }

        setCryptos(sortByVariant(variant, data.data));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setCryptos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    intervalId = setInterval(fetchData, 60000);

    return () => clearInterval(intervalId);
  }, [variant]);

  useEffect(() => {
    if (!paymentCoin) {
      setPaymentGatewayEnabled(false);
      setGatewayKeyId("");
      return;
    }
    let cancelled = false;
    fetch("/api/payment/config")
      .then((r) => r.json())
      .then((c) => {
        if (cancelled) return;
        setPaymentGatewayEnabled(Boolean(c.enabled));
        setGatewayKeyId(c.keyId || "");
        const r = Number(c.usdInrRate);
        if (Number.isFinite(r) && r > 0) setUsdInrRate(r);
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentGatewayEnabled(false);
          setGatewayKeyId("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paymentCoin]);

  useEffect(() => {
    if (!selectedCoin) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedCoin(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedCoin]);

  const openModal = (crypto) => {
    setSelectedCoin(crypto);
    setTimeframe("24h");
  };

  const chartHtml = useMemo(() => {
    if (!selectedCoin) return "";
    if (typeof window.renderMarketChart !== "function") return "";

    const price = parseFloat(selectedCoin.price_usd);
    const change24h = parseFloat(selectedCoin.percent_change_24h);
    const volume = parseFloat(selectedCoin.volume24);
    const symbol = (selectedCoin.symbol || "?").toUpperCase();

    return window.renderMarketChart(
      price,
      change24h,
      volume,
      symbol,
      timeframe,
    );
  }, [selectedCoin, timeframe]);

  const modalStats = useMemo(() => {
    if (!selectedCoin) return null;

    const price = parseFloat(selectedCoin.price_usd) || 0;
    const change1h = parseFloat(selectedCoin.percent_change_1h) || 0;
    const change24h = parseFloat(selectedCoin.percent_change_24h) || 0;
    const change7d = parseFloat(selectedCoin.percent_change_7d) || 0;
    const marketCap = parseFloat(selectedCoin.market_cap_usd) || 0;
    const volume = parseFloat(selectedCoin.volume24) || 0;
    const supply = parseFloat(selectedCoin.csupply) || 0;
    const symbol = (selectedCoin.symbol || "?").toUpperCase();
    const name = selectedCoin.name || "N/A";

    const volMktCap =
      marketCap > 0 ? ((volume / marketCap) * 100).toFixed(2) : "—";

    return {
      price,
      change1h,
      change24h,
      change7d,
      marketCap,
      volume,
      supply,
      symbol,
      name,
      volMktCap,
      rank: selectedCoin.rank || "-",
      iconText: symbol.charAt(0),
    };
  }, [selectedCoin]);

  const onModalContentClick = (e) => {
    const target = e.target;
    if (!target || !target.closest) return;

    const tfBtn = target.closest(".chart-timeframe");
    if (!tfBtn) return;

    const tf = tfBtn.getAttribute("data-tf");
    if (tf) setTimeframe(tf);
  };

  const onBuyClick = (e, crypto) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert("Please login first to buy this coin.");
      navigate("/login");
      return;
    }
    setPaymentCoin(crypto);
    setQuantity("1");
    setPayMethod("upi");
    setUpiId("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setPaymentError("");
    setPaymentSuccess("");
  };

  const closePaymentModal = () => {
    setPaymentCoin(null);
    setPaymentError("");
    setPaymentSuccess("");
  };

  const totalAmount = useMemo(() => {
    if (!paymentCoin) return 0;
    const qty = Number(quantity);
    const price = parseFloat(paymentCoin.price_usd) || 0;
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return qty * price;
  }, [paymentCoin, quantity]);

  const estimatedInr = useMemo(() => {
    return totalAmount * usdInrRate;
  }, [totalAmount, usdInrRate]);

  const validateQuantityOnly = () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return "Please enter a valid quantity.";
    }
    return "";
  };

  const validatePayment = () => {
    const qtyErr = validateQuantityOnly();
    if (qtyErr) return qtyErr;

    if (payMethod === "upi") {
      const normalizedUpi = upiId.trim();
      if (!normalizedUpi) return "Please enter your UPI ID.";
      if (!normalizedUpi.includes("@")) return "Please enter a valid UPI ID.";
      return "";
    }

    const digits = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(digits)) return "Card number must be 16 digits.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry))
      return "Expiry must be in MM/YY format.";
    if (!/^\d{3}$/.test(cardCvv)) return "CVV must be 3 digits.";
    return "";
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (paymentGatewayEnabled && gatewayKeyId) {
      return;
    }
    setPaymentError("");
    setPaymentSuccess("");

    const validationMsg = validatePayment();
    if (validationMsg) {
      setPaymentError(validationMsg);
      return;
    }

    const symbol = (paymentCoin?.symbol || "").toUpperCase();
    const qty = Number(quantity);
    const price = parseFloat(paymentCoin.price_usd) || 0;

    try {
      const result = await buyCrypto(symbol, qty, price);
      if (result.success) {
        setPaymentSuccess(
          `Purchase successful! You bought ${qty} ${symbol} for $${totalAmount.toFixed(2)}.`,
        );
        setTimeout(() => {
          closePaymentModal();
        }, 2000);
      } else {
        setPaymentError(result.error || "Purchase failed");
      }
    } catch (error) {
      setPaymentError("Network error. Please try again.");
    }
  };

  const startRazorpayCheckout = async () => {
    setPaymentError("");
    setPaymentSuccess("");

    const qtyErr = validateQuantityOnly();
    if (qtyErr) {
      setPaymentError(qtyErr);
      return;
    }
    if (!token) {
      setPaymentError("Please log in again.");
      return;
    }
    if (!paymentGatewayEnabled || !gatewayKeyId) {
      setPaymentError("Payment gateway is not configured.");
      return;
    }

    const symbol = (paymentCoin?.symbol || "").toUpperCase();
    const qty = Number(quantity);
    const price = parseFloat(paymentCoin.price_usd) || 0;

    setGatewayBusy(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cryptoSymbol: symbol,
          quantity: qty,
          priceUsd: price,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentError(data.error || "Could not start payment");
        return;
      }

      await loadRazorpayScript();

      const orderPayload = data;

      const options = {
        key: orderPayload.keyId || gatewayKeyId,
        amount: orderPayload.amount,
        currency: orderPayload.currency || "INR",
        order_id: orderPayload.orderId,
        name: "Crypto Market",
        description: `Buy ${symbol} × ${qty}`,
        theme: { color: "#2563eb" },
        prefill: user?.email ? { email: user.email } : {},
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok) {
              const inr = Number(orderPayload.totalInr);
              setPaymentSuccess(
                `Payment verified. You bought ${qty} ${symbol} — $${totalAmount.toFixed(2)} (≈ ₹${inr.toFixed(2)} charged).`,
              );
              setTimeout(() => closePaymentModal(), 2200);
            } else {
              setPaymentError(verifyData.error || "Payment verification failed");
            }
          } catch {
            setPaymentError("Could not verify payment with server.");
          }
        },
        modal: {
          ondismiss: () => setGatewayBusy(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (err) => {
        const desc =
          err?.error?.description || err?.error?.reason || "Payment failed";
        setPaymentError(desc);
        setGatewayBusy(false);
      });
      rzp.open();
    } catch (e) {
      setPaymentError(
        e instanceof Error ? e.message : "Could not open Razorpay checkout",
      );
    } finally {
      setGatewayBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4">
      <div className="bg-gray-900 shadow-md rounded-lg overflow-x-auto border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">#</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">1h</th>
              <th className="px-6 py-4">24h</th>
              <th className="px-6 py-4">7d</th>
              <th className="px-6 py-4">Market Cap</th>
              <th className="px-6 py-4">Volume</th>
              <th className="px-6 py-4">Circulating Supply</th>
              <th className="px-6 py-4">Buy</th>
            </tr>
          </thead>

          <tbody
            className="bg-gray-900 divide-y divide-gray-800"
            id="cryptoTableBody"
          >
            {loading ? (
              <tr>
                <td
                  colspan="11"
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Loading cryptocurrency data...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colspan="11" className="px-6 py-4 text-center text-red-500">
                  Error loading data: {error}
                </td>
              </tr>
            ) : cryptos.length === 0 ? (
              <tr>
                <td
                  colspan="11"
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No cryptocurrency data available
                </td>
              </tr>
            ) : (
              cryptos.map((crypto, idx) => {
                const rank = crypto.rank || idx + 1;
                const price = parseFloat(crypto.price_usd) || 0;
                const change1h = parseFloat(crypto.percent_change_1h) || 0;
                const change24h = parseFloat(crypto.percent_change_24h) || 0;
                const change7d = parseFloat(crypto.percent_change_7d) || 0;
                const marketCap = parseFloat(crypto.market_cap_usd) || 0;
                const volume = parseFloat(crypto.volume24) || 0;
                const supply = parseFloat(crypto.csupply) || 0;
                const symbol = (crypto.symbol || "").toUpperCase();
                const displayName = crypto.name || "N/A";

                return (
                  <tr
                    key={crypto.id}
                    className="hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => openModal(crypto)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openModal(crypto);
                    }}
                  >
                    <td className="px-6 py-4 text-gray-300">{rank}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-100">
                          {displayName}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-800 text-gray-200 border border-gray-700 rounded text-xs font-semibold">
                        {symbol || "N/A"}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-100">
                      {formatPrice(price)}
                    </td>

                    <td className="px-6 py-4">
                      <span className={getChangeColor(change1h)}>
                        {change1h > 0 ? "+" : ""}
                        {change1h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getChangeColor(change24h)}>
                        {change24h > 0 ? "+" : ""}
                        {change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getChangeColor(change7d)}>
                        {change7d > 0 ? "+" : ""}
                        {change7d.toFixed(2)}%
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-300">
                      {formatNumber(marketCap)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {formatNumber(volume)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {supply ? supply.toLocaleString() : "-"}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        className="buy-btn px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                        onClick={(e) => onBuyClick(e, crypto)}
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Coin Modal */}
      {selectedCoin && modalStats && (
        <div
          id="coinModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-hidden="false"
          onClick={() => setSelectedCoin(null)}
        >
          <div
            className="bg-gray-900 text-gray-100 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={() => {
              // Prevent accidental overlay click dragging.
            }}
          >
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-200">
                  {modalStats.iconText}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-100">
                    {modalStats.name} {modalStats.symbol}
                  </h2>
                  <p className="text-sm text-gray-400">#{modalStats.rank}</p>
                </div>
              </div>

              <button
                type="button"
                id="closeModal"
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                aria-label="Close"
                onClick={() => setSelectedCoin(null)}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6" onClick={onModalContentClick}>
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-bold text-gray-100">
                    {formatPrice(modalStats.price)}
                  </p>
                  <p
                    className={`mt-1 text-sm ${getChangeColor(modalStats.change24h)}`}
                  >
                    {modalStats.change24h > 0 ? "+" : ""}
                    {modalStats.change24h.toFixed(2)}% (24h)
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Market cap
                    </p>
                    <p className="font-semibold text-gray-100 mt-0.5">
                      {formatNumber(modalStats.marketCap)}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Volume (24h)
                    </p>
                    <p className="font-semibold text-gray-100 mt-0.5">
                      {formatNumber(modalStats.volume)}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Vol/Mkt Cap (24h)
                    </p>
                    <p className="font-semibold text-gray-100 mt-0.5">
                      {modalStats.volMktCap}%
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Circulating supply
                    </p>
                    <p className="font-semibold text-gray-100 mt-0.5">
                      {modalStats.supply
                        ? modalStats.supply.toLocaleString() +
                          " " +
                          modalStats.symbol
                        : "—"}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      1h
                    </p>
                    <p
                      className={`font-semibold mt-0.5 ${getChangeColor(modalStats.change1h)}`}
                    >
                      {modalStats.change1h > 0 ? "+" : ""}
                      {modalStats.change1h.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      7d
                    </p>
                    <p
                      className={`font-semibold mt-0.5 ${getChangeColor(modalStats.change7d)}`}
                    >
                      {modalStats.change7d > 0 ? "+" : ""}
                      {modalStats.change7d.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div id="detailChartWrap">
                  <div dangerouslySetInnerHTML={{ __html: chartHtml }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentCoin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closePaymentModal}
        >
          <div
            className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Buy {paymentCoin.name}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200"
                onClick={closePaymentModal}
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitPayment}>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200">
                Total:{" "}
                <span className="font-semibold">${totalAmount.toFixed(2)}</span>
                {paymentGatewayEnabled && gatewayKeyId ? (
                  <span className="block text-gray-400 mt-1">
                    ≈ ₹{estimatedInr.toFixed(2)} INR (before Razorpay; rate uses
                    USD_INR on server)
                  </span>
                ) : null}
              </div>

              {paymentGatewayEnabled && gatewayKeyId ? (
                <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 p-4 space-y-3">
                  <p className="text-sm text-gray-200">
                    Secure checkout via{" "}
                    <span className="font-semibold text-emerald-300">
                      Razorpay
                    </span>
                    : UPI, net banking, debit/credit cards. Payment is verified
                    on the server (signature + Razorpay payment status) before
                    your purchase is saved.
                  </p>
                  <button
                    type="button"
                    onClick={startRazorpayCheckout}
                    disabled={gatewayBusy}
                    className="w-full py-2.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {gatewayBusy
                      ? "Starting checkout…"
                      : "Pay with Razorpay (verified)"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/60 rounded-md px-3 py-2">
                  Demo mode: set{" "}
                  <code className="text-amber-100">RAZORPAY_KEY_ID</code> and{" "}
                  <code className="text-amber-100">RAZORPAY_KEY_SECRET</code> in
                  server <code className="text-amber-100">.env</code> for live
                  payments. Optional: <code className="text-amber-100">USD_INR_RATE</code>{" "}
                  (default 83).
                </p>
              )}

              {!paymentGatewayEnabled || !gatewayKeyId ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod("upi")}
                      className={`px-3 py-2 rounded-md text-sm font-medium border ${
                        payMethod === "upi"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      Pay with UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("card")}
                      className={`px-3 py-2 rounded-md text-sm font-medium border ${
                        payMethod === "card"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      Pay with Card
                    </button>
                  </div>

                  {payMethod === "upi" ? (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        placeholder="name@bank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Expiry
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            CVV
                          </label>
                          <input
                            type="password"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700"
                  >
                    Pay Now (demo)
                  </button>
                </>
              ) : null}

              {paymentError ? (
                <p className="text-sm text-red-400">{paymentError}</p>
              ) : null}
              {paymentSuccess ? (
                <p className="text-sm text-green-400">{paymentSuccess}</p>
              ) : null}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
