import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Printer, ArrowLeft, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  seller_payout: number;
  payment_method: string;
  breakdown: any;
  created_at: string;
  buyer_id: string;
  seller_id: string | null;
}

export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      setInvoice(data as Invoice | null);
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) {
    return (
      <DashboardLayout title="Invoice">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice">
        <div className="max-w-md mx-auto text-center py-16">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold mb-2">No invoice yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Invoices are generated after the order is paid.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Go back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isSeller = user?.id === invoice.seller_id;

  return (
    <DashboardLayout title="Invoice" subtitle={invoice.invoice_number}>
      <div className="max-w-3xl mx-auto print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
          </Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Farmline</h1>
                <p className="text-xs text-muted-foreground">Farm-to-doorstep marketplace</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                <p className="font-mono font-semibold">{invoice.invoice_number}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(invoice.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm border-y border-border py-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Order ID</p>
                <p className="font-mono">{invoice.order_id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Payment method</p>
                <p className="capitalize">{invoice.payment_method}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product subtotal</span>
                <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>₹{Number(invoice.delivery_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform commission (11%, included)</span>
                <span>₹{Number(invoice.platform_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-3 border-t border-border">
                <span>Total paid by buyer</span>
                <span className="text-primary">₹{Number(invoice.total).toFixed(2)}</span>
              </div>
              {isSeller && (
                <div className="flex justify-between text-success font-semibold pt-2">
                  <span>Your payout</span>
                  <span>₹{Number(invoice.seller_payout).toFixed(2)}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              This is a system-generated invoice. For support, contact help@farmline.works.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}