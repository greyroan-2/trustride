import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const styles = cva("button", {
  variants: { variant: { default: "", outline: "outline" } },
  defaultVariants: { variant: "default" },
});
export function Button({
  className,
  variant,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles>) {
  return <button className={cn(styles({ variant }), className)} {...props} />;
}
