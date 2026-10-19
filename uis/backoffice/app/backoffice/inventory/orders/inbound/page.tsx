import dynamic from "next/dynamic";
import styles from "../../inventory.module.css";

const OrderForm = dynamic(() => import("../../../../../components/inventory/OrderForm"), {
  loading: () => <p role="status" className={styles.loading}>Cargando formulario de entrada...</p>,
  ssr: false,
});

export default function InboundPage() {
  return <OrderForm direction="inbound" />;
}