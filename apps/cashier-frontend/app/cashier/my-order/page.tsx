'use client';

import OrderCard from '../components/OrderCard';
import styles from './page.module.css';

const orders = [
  { id: 1, date: '24 June', time: '12:30 PM', name: 'Americano', price: 3.0, quantity: 1 },
  { id: 2, date: '24 June', time: '12:30 PM', name: 'Cappuccino', price: 4.0, quantity: 1 },
  { id: 3, date: '22 June', time: '10:15 AM', name: 'Latte', price: 4.5, quantity: 2 },
];

export default function MyOrderPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.menuBtn}>☰</button>
        <h1 className={styles.title}>My Order</h1>
        <div className={styles.spacer} />
      </header>
      <div className={styles.orderList}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            date={order.date}
            time={order.time}
            productName={order.name}
            price={order.price}
            quantity={order.quantity}
            onOrderAgain={() => console.log('Order again:', order.name)}
          />
        ))}
      </div>
    </div>
  );
}
