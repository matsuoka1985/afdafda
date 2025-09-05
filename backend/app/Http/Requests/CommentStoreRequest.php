<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Contracts\Validation\Validator;

class CommentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => 'required|string|max:120',
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'コメント内容は必須です',
            'body.max' => 'コメントは120文字以内で入力してください',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'error' => 'バリデーションエラー',
                'details' => $validator->errors()
            ], 422)
        );
    }
}