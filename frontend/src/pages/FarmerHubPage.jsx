import React, { useState, useEffect } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import api from '../api';
import OrderRowSkeleton from '../components/OrderRowSkeleton';
import EmptyState from '../components/EmptyState';
// You would create these components for displaying orders and products
// import OrderTable from '../components/OrderTable';
// import ProductTable from '../components/ProductTable';

const FarmerHubPage = () => {
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (tab === 0) {
          const { data } = await api.get('/orders/');
          setOrders(data);
        } else {
          const { data } = await api.get('/products/');
          setProducts(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab]);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleChange} aria-label="Farmer Hub Tabs">
          <Tab label="My Orders" />
          <Tab label="My Products" />
        </Tabs>
      </Box>
      <Box sx={{ pt: 3 }}>
        {loading ? (
          tab === 0 ? <OrderRowSkeleton /> : "Product Skeleton" // Replace with ProductTableSkeleton
        ) : (
          <>
            {tab === 0 && (
              orders.length === 0 ? <EmptyState message="You have no orders." /> : "Order Table" // Replace with <OrderTable orders={orders} />
            )}
            {tab === 1 && (
              products.length === 0 ? <EmptyState message="You have no products." /> : "Product Table" // Replace with <ProductTable products={products} />
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default FarmerHubPage;
