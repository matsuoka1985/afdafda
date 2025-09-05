<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Contracts\Validation\Validator;

class RegisterRequest extends FormRequest
{
    /**
     * リクエストが認可されているかどうかを判定
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        return [
            'firebase_uid' => 'required|string|unique:users,firebase_uid',
            'name' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ];
    }

    /**
     * エラーメッセージのカスタマイズ
     */
    public function messages(): array
    {
        return [
            'name.required' => 'ユーザーネームを入力してください',
            'name.max' => '20文字以内で入力してください',
            'email.required' => 'メールアドレスを入力してください',
            'email.email' => '正しいメールアドレスを入力してください',
            'password.required' => 'パスワードを入力してください',
            'password.min' => '6文字以上で入力してください',
            'firebase_uid.unique' => 'このFirebase UIDは既に登録されています',
            'email.unique' => 'このメールアドレスは既に登録されています',
        ];
    }

    /**
     * バリデーション失敗時の処理
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'error' => 'バリデーションエラー',
                'details' => $validator->errors()
            ], 400)
        );
    }
}