import { memo } from 'react';
import {
  ListItem,
  ListItemText,
  Button,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import api from '../api';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';

const OrderRow = memo(({ order, onTrack, getStatusColor }) => {
  // Handle new order structure from API
  const orderNumber = order.order_number || `#${order.id}`;
  const productName = order.first_product_name || order.product_name || 'Products';
  const itemCount = order.item_count || order.quantity || 1;
  const totalAmount = order.total_amount || order.total_price || 0;
  const status = order.status || 'pending';

  return (
    <ListItem
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        mb: 2,
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="h6">{orderNumber}</Typography>
        <Chip
          label={status.charAt(0).toUpperCase() + status.slice(1)}
          color={getStatusColor(status)}
          size="small"
        />
      </Box>
      <ListItemText
        primary={`${productName}${itemCount > 1 ? ` and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}` : ''}`}
        secondary={
          <>
            Total: ৳{totalAmount.toFixed(2)}
            <br />
            Date: {new Date(order.created_at).toLocaleDateString()}
            {itemCount > 1 && (
              <>
                <br />
                Items: {itemCount}
              </>
            )}
          </>
        }
      />
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={() => onTrack(order.id)}>
          Track
        </Button>
        {order.payment_status === 'pending' && order.status === 'pending' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<CreditCard />}
            onClick={async () => {
              try {
                const response = await api.post(`/api/v1/orders/${order.id}/payment/initiate/`);
                const paymentData = response.data?.data || response.data;
                if (paymentData?.gateway_url) {
                  window.location.href = paymentData.gateway_url;
                } else {
                  toast.error('Failed to initiate payment');
                }
              } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to initiate payment');
              }
            }}
          >
            Pay Now
          </Button>
        )}
      </Box>
    </ListItem>
  );
});

OrderRow.displayName = 'OrderRow';

export default OrderRow;

