import React, { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [completedSale, setCompletedSale] = useState(null);

  // Add item to cart
  const addItemByProduct = (product, quantity = 1, serialNumber = '') => {
    setItems((prevItems) => {
      if (product.isSerialized || serialNumber) {
        // Serialized products are treated as individual line items per serial number
        const exists = prevItems.some(
          (item) => item.product._id === product._id && item.serialNumber === serialNumber
        );
        if (exists) return prevItems;
        return [...prevItems, { product, unit: 1, serialNumber }];
      } else {
        // Non-serialized products increase quantity per price tier (MRP)
        const productMrp = Number(product.mrp || 0);
        const existingIndex = prevItems.findIndex(
          (item) =>
            item.product._id === product._id &&
            !item.serialNumber &&
            Number(item.product.mrp || 0) === productMrp
        );

        if (existingIndex > -1) {
          const updated = [...prevItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            unit: updated[existingIndex].unit + quantity,
          };
          return updated;
        } else {
          return [...prevItems, { product, unit: quantity, serialNumber: '' }];
        }
      }
    });
  };

  // Update quantity for non-serialized items
  const updateQuantity = (productId, newQty, mrp = null) => {
    setItems((prevItems) => {
      if (newQty <= 0) {
        return prevItems.filter(
          (item) =>
            !(
              item.product._id === productId &&
              !item.serialNumber &&
              (mrp === null || Number(item.product.mrp || 0) === Number(mrp))
            )
        );
      }
      return prevItems.map((item) => {
        if (
          item.product._id === productId &&
          !item.serialNumber &&
          (mrp === null || Number(item.product.mrp || 0) === Number(mrp))
        ) {
          return { ...item, unit: newQty };
        }
        return item;
      });
    });
  };

  // Remove specific item
  const removeItem = (productId, serialNumber = '', mrp = null) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.product._id === productId &&
            (item.serialNumber || '') === (serialNumber || '') &&
            (mrp === null || Number(item.product.mrp || 0) === Number(mrp))
          )
      )
    );
  };

  // Clear cart
  const clearCart = () => {
    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaymentMethod('CASH');
  };

  // Helper to compute effective selling price (MRP - discountValue)
  const getItemPrice = (product) => {
    if (!product) return 0;
    const mrp = Number(product.mrp || 0);
    const discountVal = Number(product.discountValue || 0);
    const discountAmount = product.discountType === 'percentage'
      ? (mrp * discountVal) / 100
      : discountVal;
    if (discountAmount > 0) {
      return Math.max(0, mrp - discountAmount);
    }
    return Number(product.sellingPrice ?? mrp);
  };

  const getItemDiscount = (product) => {
    if (!product) return 0;
    const mrp = Number(product.mrp || 0);
    const discountVal = Number(product.discountValue || 0);
    return product.discountType === 'percentage'
      ? (mrp * discountVal) / 100
      : discountVal;
  };

  // Computed Totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableValue = 0;

    items.forEach((item) => {
      const price = getItemPrice(item.product);
      const discountAmount = getItemDiscount(item.product);
      const qty = Number(item.unit || 1);
      const gstRate = Number(item.product?.cgstRate || 0) + Number(item.product?.sgstRate || 0) || Number(item.product?.gstRate || 18);

      const lineSubtotal = price * qty;
      subtotal += lineSubtotal;
      totalDiscount += discountAmount * qty;

      // Calculate GST tax portion
      const tax = (lineSubtotal * gstRate) / 100;
      taxableValue += tax;
    });

    const grandTotal = subtotal + taxableValue;

    return {
      subtotal,
      totalDiscount,
      taxableValue,
      grandTotal,
    };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItemByProduct,
        updateQuantity,
        removeItem,
        clearCart,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerAddress,
        setCustomerAddress,
        paymentMethod,
        setPaymentMethod,
        completedSale,
        setCompletedSale,
        totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
