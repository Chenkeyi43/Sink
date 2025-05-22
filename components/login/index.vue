<script setup>
import { AlertCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const LoginSchema = z.object({
  token: z.string().describe('SiteToken'),
})
const loginFieldConfig = {
  token: {
    inputProps: {
      type: 'password',
      placeholder: '********',
    },
  },
}

const { previewMode } = useRuntimeConfig().public

async function onSubmit(form) {
  try {
    localStorage.setItem('SinkSiteToken', form.token)
    const response = await useAPI('/api/verify')
    
    // 如果不是管理员，禁止登录
    if (!response.isAdmin) {
      localStorage.removeItem('SinkSiteToken')
      throw new Error('只有管理员可以登录后台管理界面')
    }
    
    navigateTo('/dashboard')
  }
  catch (e) {
    console.error(e)
    localStorage.removeItem('SinkSiteToken')
    toast.error('登录失败', {
      description: e.message || '请检查您的 Token 是否正确',
    })
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl">
        Login
      </CardTitle>
      <CardDescription>
        Enter your site token to login.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <AutoForm
        class="space-y-6"
        :schema="LoginSchema"
        :field-config="loginFieldConfig"
        @submit="onSubmit"
      >
        <Alert v-if="previewMode">
          <AlertCircle class="w-4 h-4" />
          <AlertTitle>Tips</AlertTitle>
          <AlertDescription>
            The site token for preview mode is <code class="font-mono text-green-500">SinkCool</code> .
          </AlertDescription>
        </Alert>
        <Button class="w-full">
          Login
        </Button>
      </AutoForm>
    </CardContent>
  </Card>
</template>
