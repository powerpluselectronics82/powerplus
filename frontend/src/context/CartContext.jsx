import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [completedSale, setCompletedSale] = useState(null);
  const [notification, setNotification] = useState(null);

  // Notify helper with auto-clear
  const notify = (message, type = 'warning', title = 'Stock Limit Exceeded') => {
    setNotification({
      id: Date.now(),
      message,
      type,
      title,
    });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Add item to cart with stock validation
  const addItemByProduct = (product, quantity = 1, serialNumber = '') => {
    let result = { success: true, message: '' };

    setItems((prevItems) => {
      if (product.isSerialized || serialNumber) {
        // Serialized products are treated as individual line items per serial number
        const exists = prevItems.some(
          (item) => item.product._id === product._id && item.serialNumber === serialNumber
        );
        if (exists) {
          result = {
            success: false,
            message: `Serial number "${serialNumber}" is already in the cart.`,
          };
          return prevItems;
        }
        return [...prevItems, { product, unit: 1, serialNumber }];
      } else {
        // Non-serialized products increase quantity per purchase cost tier / inventory batch
        const productCost = Number(product.purchasePrice || 0);
        const branchInvId = product.branchInventoryId || product._id;
        const maxStock = Number(
          product.stock ??
          product.availableStock ??
          product.Stock ??
          product.quantity ??
          Infinity
        );

        if (maxStock <= 0) {
          result = {
            success: false,
            message: `"${product.name}" is currently out of stock.`,
          };
          return prevItems;
        }

        const existingIndex = prevItems.findIndex(
          (item) =>
            item.product._id === product._id &&
            !item.serialNumber &&
            (item.product.branchInventoryId
              ? item.product.branchInventoryId === branchInvId
              : Number(item.product.purchasePrice || 0) === productCost)
        );

        const currentQty = existingIndex > -1 ? Number(prevItems[existingIndex].unit || 0) : 0;
        if (currentQty + quantity > maxStock) {
          result = {
            success: false,
            message: `Cannot add more. Stock limit (${maxStock}) reached for "${product.name}". You already have ${currentQty} in cart.`,
          };
          return prevItems;
        }

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

    if (!result.success && result.message) {
      notify(result.message, 'warning', 'Stock Limit Exceeded');
    }

    return result;
  };

  // Update quantity for non-serialized items with stock validation
  const updateQuantity = (productId, newQty, branchInventoryId = null) => {
    let result = { success: true, message: '' };

    setItems((prevItems) => {
      const targetIndex = prevItems.findIndex(
        (item) =>
          item.product._id === productId &&
          !item.serialNumber &&
          (branchInventoryId === null ||
            item.product.branchInventoryId === branchInventoryId ||
            item.product._id === branchInventoryId ||
            Number(item.product.purchasePrice || 0) === Number(branchInventoryId))
      );

      if (targetIndex === -1) return prevItems;

      const targetItem = prevItems[targetIndex];
      const maxStock = Number(
        targetItem.product.stock ??
        targetItem.product.availableStock ??
        targetItem.product.Stock ??
        targetItem.product.quantity ??
        Infinity
      );

      if (newQty <= 0) {
        return prevItems.filter((_, idx) => idx !== targetIndex);
      }

      if (newQty > maxStock) {
        result = {
          success: false,
          message: `Cannot add more. Only ${maxStock} unit(s) available in stock for "${targetItem.product.name}".`,
        };
        return prevItems;
      }

      const updated = [...prevItems];
      updated[targetIndex] = {
        ...updated[targetIndex],
        unit: newQty,
      };
      return updated;
    });

    if (!result.success && result.message) {
      notify(result.message, 'warning', 'Stock Limit Exceeded');
    }

    return result;
  };

  // Remove specific item
  const removeItem = (productId, serialNumber = '', branchInventoryId = null) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.product._id === productId &&
            (item.serialNumber || '') === (serialNumber || '') &&
            (branchInventoryId === null ||
              item.product.branchInventoryId === branchInventoryId ||
              item.product._id === branchInventoryId ||
              Number(item.product.purchasePrice || 0) === Number(branchInventoryId))
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
    setCustomerGstin('');
    setExchangeAmount('');
    setPaymentMethod('CASH');
  };

  // Update manual selling price for cart line item
  const updateItemPrice = (productId, newPrice, serialNumber = '', branchInventoryId = null) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        const matches =
          item.product._id === productId &&
          (item.serialNumber || '') === (serialNumber || '') &&
          (branchInventoryId === null ||
            item.product.branchInventoryId === branchInventoryId ||
            item.product._id === branchInventoryId ||
            Number(item.product.purchasePrice || 0) === Number(branchInventoryId));

        if (!matches) return item;

        const parsedPrice = newPrice === '' ? '' : Math.max(0, Number(newPrice) || 0);
        return {
          ...item,
          manualPrice: parsedPrice,
        };
      })
    );
  };

  // Helper to compute effective selling price (respects manualPrice override, then product.sellingPrice)
  const getItemPrice = (product, item = null) => {
    if (item && item.manualPrice !== undefined && item.manualPrice !== null && item.manualPrice !== '') {
      return Math.max(0, Number(item.manualPrice));
    }
    if (!product) return 0;
    return Number(product.sellingPrice ?? product.unitPrice ?? 0);
  };

  const getItemDiscount = () => 0;

  // Computed Totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableValue = 0;

    items.forEach((item) => {
      const price = getItemPrice(item.product, item);
      const discountAmount = getItemDiscount(item.product, item);
      const qty = Number(item.unit || 1);
      const cgst = item.product?.cgstRate !== undefined && item.product?.cgstRate !== null && item.product?.cgstRate !== '' ? Number(item.product.cgstRate) : 0;
      const sgst = item.product?.sgstRate !== undefined && item.product?.sgstRate !== null && item.product?.sgstRate !== '' ? Number(item.product.sgstRate) : 0;
      const directGst = item.product?.gstRate !== undefined && item.product?.gstRate !== null && item.product?.gstRate !== '' ? Number(item.product.gstRate) : 0;
      const gstRate = (cgst + sgst) > 0 ? (cgst + sgst) : directGst;

      const lineSubtotal = price * qty;
      subtotal += lineSubtotal;
      totalDiscount += discountAmount * qty;

      // Calculate GST tax portion (0 if product has no GST)
      const tax = (lineSubtotal * gstRate) / 100;
      taxableValue += tax;
    });

    const parsedExchange = Math.max(0, Number(exchangeAmount) || 0);
    const beforeExchange = subtotal + taxableValue - totalDiscount;
    const effectiveExchange = Math.min(parsedExchange, beforeExchange);
    const grandTotal = Math.max(0, Number((beforeExchange - effectiveExchange).toFixed(2)));

    return {
      subtotal,
      totalDiscount,
      taxableValue,
      exchangeAmount: effectiveExchange,
      rawExchangeAmount: exchangeAmount,
      grandTotal,
    };
  }, [items, exchangeAmount]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItemByProduct,
        updateQuantity,
        updateItemPrice,
        getItemPrice,
        getItemDiscount,
        removeItem,
        clearCart,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerAddress,
        setCustomerAddress,
        customerGstin,
        setCustomerGstin,
        exchangeAmount,
        setExchangeAmount,
        paymentMethod,
        setPaymentMethod,
        completedSale,
        setCompletedSale,
        totals,
        notification,
        notify,
        clearNotification,
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
