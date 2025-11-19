// src/pages/Checkout.tsx
import { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { api } from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';

const stripePk = process.env.REACT_APP_STRIPE_PK;
const stripeActive = process.env.REACT_APP_STRIPE_ACTIVE;

const stripePromise: Promise<Stripe | null> | null = (stripePk && stripeActive === "true") ? loadStripe(stripePk as string) : null;

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onPay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // на успех вернём юзера обратно на вики конкретного кокпита
                // return_url: window.location.origin + window.location.pathname.replace('/pay', '/wiki'),
                return_url: window.location.origin + '/cockpits',
            },
            redirect: 'if_required',
        });
        setLoading(false);

        if (error) {
            setError(error.message || 'Payment error');
        } else {
            // если редиректа не было — вручную ведём на wiki
            // navigate(window.location.pathname.replace('/pay', '/wiki'));
            setTimeout(() => {
                navigate('/cockpits');
            }, 2000);
        }
    };

    return (
        <form onSubmit={onPay} style={{ maxWidth: 480, margin: '0 auto' }}>
            <PaymentElement />
            {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
            <button disabled={!stripe || loading} style={{ marginTop: 12 }}>
                {loading ? 'Processing…' : 'Pay'}
            </button>
        </form>
    );
}

export default function Checkout({ cockpitId }: { cockpitId: number }) {
    // делаем явные типы и храним ошибки, чтобы понимать, что пошло не так
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // ЗАЩИТА от двойного вызова useEffect в React StrictMode:
    // если уже грузимся или уже есть clientSecret — второй вызов прерываем
    useEffect(() => {
        if (!stripePromise) return;
        if (loading || clientSecret) return;
        setLoading(true);
        api.post('/purchases/create-intent', { cockpitId })
            .then(r => setClientSecret(r.data.clientSecret))
            .catch(e => {
                console.error('create-intent error:', e?.response || e);
                setError(e?.response?.data?.message || 'Failed to init checkout');
            })
            .finally(() => setLoading(false));
    }, [cockpitId, loading, clientSecret]);

    if (!stripePromise) {
        return(
            <div style={{color: 'crimson'}}>
                Payments are disabled: REACT_APP_STRIPE_PK is missing or REACT_APP_STRIPE_ACTIVE is false;
            </div>
        )
    }

    if (error) return <div style={{ color: 'crimson' }}>{error}</div>;
    if (!clientSecret) return <div>Loading checkout…</div>;

    return (
        <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: 'stripe' } }}
        >
            <CheckoutForm clientSecret={clientSecret} />
        </Elements>
    );
}

export function CheckoutWrapper() {
    const { id } = useParams<{ id: string }>();
    return <Checkout cockpitId={Number(id)} />;
}
