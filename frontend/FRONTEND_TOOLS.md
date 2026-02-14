# Frontend Tools & Setup

This frontend is now equipped with modern tools for rapid development.

## 🎨 Styling - TailwindCSS

**Usage:**
```tsx
<div className="rounded-lg bg-purple-600 p-4 text-white hover:bg-purple-700">
  Hello World
</div>
```

**Resources:**
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

**Utility Helper (`cn`):**
```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  "hover:something"
)} />
```

## 📋 Forms - React Hook Form + Zod

**Example:** See `src/components/ExampleForm.tsx`

**Basic Usage:**
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => console.log(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

## 🔄 Data Fetching - React Query

**Setup:** Already configured in `App.tsx`

**Basic Usage:**
```tsx
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then(r => r.json()),
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{data.map(todo => <div key={todo.id}>{todo.title}</div>)}</div>
}
```

**Mutations:**
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreateTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newTodo) => fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <button onClick={() => mutation.mutate({ title: 'New Todo' })}>
      Create Todo
    </button>
  )
}
```

## 🎯 Icons - Lucide React

**Usage:**
```tsx
import { Heart, Check, X, ArrowRight } from 'lucide-react'

<Heart className="h-6 w-6 text-red-500" />
<Check size={24} color="green" />
```

**Resources:**
- [Browse all icons](https://lucide.dev/icons/)

## 📁 Project Structure

```
src/
├── api/          # API client and types
├── components/   # Reusable components
├── lib/          # Utilities (cn, query-client)
├── pages/        # Route pages
├── App.tsx       # Main app with providers
├── main.tsx      # Entry point
└── index.css     # Tailwind imports
```

## 🚀 Quick Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Build for production
pnpm lint     # Run ESLint
pnpm format   # Format with Prettier
```

## 💡 Tips

1. **Prettier sorts Tailwind classes automatically** - Just write classes in any order!
2. **Use `cn()` for conditional classes** - It merges Tailwind classes intelligently
3. **React Query handles caching** - No need to manage loading states manually everywhere
4. **Zod provides runtime validation** - Your types stay in sync with validation

## 🎨 Example Component Pattern

```tsx
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-data'],
    queryFn: fetchMyData,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-red-50 p-4 text-red-800">
        <AlertCircle className="h-5 w-5" />
        <span>Error: {error.message}</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-lg border p-6",
      data.isActive && "border-green-500 bg-green-50"
    )}>
      {/* Your content */}
    </div>
  )
}
```
