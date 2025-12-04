'use client';

import Image from 'next/image';
import styles from './OrderCard.module.css';

interface OrderCardProps {
  date: string;
  time: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  onOrderAgain?: () => void;
}

export default function OrderCard({
  date,
  time,
  productName,
  price,
  quantity,
  image = '/images/coffee.svg',
  onOrderAgain,
}: OrderCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.date}>{date} | {time}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <Image src={image} alt={productName} width={60} height={60} className={styles.image} />
        </div>
        <div className={styles.details}>
          <h3 className={styles.name}>{productName}</h3>
          <div className={styles.priceRow}>
            <span className={styles.price}>$ {price.toFixed(2)}</span>
            <span className={styles.quantity}>x {quantity}</span>
          </div>
        </div>
      </div>
      <button className={styles.orderAgainBtn} onClick={onOrderAgain}>
        Order Again
      </button>
    </div>
  );
}
