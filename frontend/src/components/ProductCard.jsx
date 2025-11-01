import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import useCartStore from '../store/useCartStore';
import { memo } from 'react';

const ProductCard = memo(({ product }) => {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardMedia
        component="img"
        height="140"
        image={`https://via.placeholder.com/150?text=${product.name}`} // Placeholder image
        alt={product.name}
        loading="lazy"
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="div">
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.description}
        </Typography>
        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
          Tk {product.price}
        </Typography>
      </CardContent>
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => addToCart(product)}
        >
          Add to Cart
        </Button>
      </Box>
    </Card>
  );
});

export default ProductCard;
