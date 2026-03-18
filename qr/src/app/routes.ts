import { createBrowserRouter } from "react-router";
import { WelcomePage } from "@/app/pages/WelcomePage";
import { ShoppingCartPage } from "@/app/pages/ShoppingCartPage";
import { CompletedPage } from "@/app/pages/CompletedPage";
import { PurchaseDetailsPage } from "@/app/pages/PurchaseDetailsPage";
import { FeedbackPage } from "@/app/pages/FeedbackPage";
import { NoItemsPage } from "@/app/pages/NoItemsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
  },
  {
    path: "/cooler/:device_id",
    Component: WelcomePage,
  },
  {
    path: "/cart",
    Component: ShoppingCartPage,
  },
  {
    path: "/completed",
    Component: CompletedPage,
  },
  {
    path: "/purchase-details",
    Component: PurchaseDetailsPage,
  },
  {
    path: "/feedback",
    Component: FeedbackPage,
  },
  {
    path: "/no-items",
    Component: NoItemsPage,
  },
]);