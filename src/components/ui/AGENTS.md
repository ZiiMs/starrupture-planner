# src/components/ui - shadcn/ui Component Library

**Generated:** 2026-01-12

## OVERVIEW

Comprehensive shadcn/ui component collection (53 components). Radix UI primitives + custom styling via CVA and Tailwind.

## STRUCTURE

```
src/components/ui/
├── button.tsx       # CVA variants: default, outline, secondary, ghost, destructive, link
├── card.tsx         # CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction
├── input.tsx        # Form inputs with variants
├── dialog.tsx       # Modal dialogs
├── dropdown-menu.tsx# Nested menus with submenus
├── select.tsx       # Select dropdowns
├── combobox.tsx     # Searchable combobox (cmdk)
├── [other 49 components]
```

## WHERE TO LOOK

| Task         | Component                                         | Notes                         |
| ------------ | ------------------------------------------------- | ----------------------------- |
| Form inputs  | input.tsx, textarea.tsx, select.tsx, combobox.tsx | All support `className` merge |
| Navigation   | dropdown-menu.tsx, navigation-menu.tsx, tabs.tsx  | Nested menu support           |
| Data display | table.tsx, card.tsx, badge.tsx                    | Table with variants           |
| Feedback     | alert.tsx, alert-dialog.tsx, sonner.tsx           | Toasts via sonner             |
| Layout       | resizable.tsx, sidebar.tsx, separator.tsx         | Panel resizing, sidebar       |

## CONVENTIONS

- **Exports**: Named exports only (`export { Button, buttonVariants }`)
- **Props**: `React.ComponentProps<"element">` + spread + `className`
- **Variants**: CVA with `variant` and `size` props
- **asChild**: Radix `Slot.Root` for polymorphic rendering
- **Styling**: `cn(variantClasses, className)` for class merging
- **Icons**: Import from `lucide-react`, position with `data-icon` attributes
- **Data attributes**: `data-slot`, `data-variant`, `data-size` for targeting

## ANTI-PATTERNS

- Don't use default exports
- Don't add `asChild` prop to components that don't support it
- Don't modify CVA variants - extend via `className` prop instead
